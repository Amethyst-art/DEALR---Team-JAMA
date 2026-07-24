/**
 * Dealr — newDealr-app.tsx
 *
 * Stack:  React + Framer Motion + TypeScript
 * AI:     Gemini (via POST /price)
 * Pay:    Monnify (via POST /pay + POST /payout)
 *
 * Backend endpoints expected:
 *   POST /price    { prompt: string }           → { reply: string }
 *   POST /pay      { amount, email, jobId }     → { checkoutUrl: string }
 *   POST /payout   { amount, jobId }            → { message: string }
 *   GET  /health                                → { status: "ok" }
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  bg:     "#0B0F17",
  surf:   "#111720",
  surf2:  "#18202E",
  bdr:    "rgba(255,255,255,0.07)",
  bdr2:   "rgba(255,255,255,0.12)",
  gold:   "#D4A853",
  goldl:  "rgba(212,168,83,0.12)",
  goldd:  "#A07830",
  green:  "#2DD4A0",
  greenl: "rgba(45,212,160,0.12)",
  red:    "#F06057",
  redl:   "rgba(240,96,87,0.12)",
  amber:  "#F59E0B",
  amberl: "rgba(245,158,11,0.12)",
  t1:     "#F0F2F8",
  t2:     "#8891A8",
  t3:     "#4A5268",
  accent: "linear-gradient(135deg, #D4A853 0%, #A07830 100%)",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', sans-serif;
  background: #0B0F17;
  color: #F0F2F8;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 80% 80%, rgba(212,168,83,0.06), transparent);
}
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:.35 } }
@keyframes blink   { 0%,100% { opacity:1 } 50% { opacity:0 } }
.mono { font-family: 'DM Mono', monospace; }
.syne { font-family: 'Syne', sans-serif; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Role    = "artisan" | "client";
type Screen  = "auth" | "onboard" | "app";
type Section = "dashboard" | "jobs" | "pricing" | "bidding" | "wallet" | "messages" | "tracker" | "profile";
type ToastFn = (msg: string) => void;

interface JobItem { desc: string; meta: string; amt: string; st: "escrow" | "pending" | "done"; }
interface ChatMsg { type: "user" | "bot"; text: string; breakdown?: Record<string,string>; range?: string; valid?: boolean; verdict?: string; }
interface ParsedAI { chatText: string; verdict: string; valid: boolean; range: string; breakdown: Record<string,string>; }

// ─── Motion Presets ───────────────────────────────────────────────────────────

const fadeUp = {
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

const stagger  = { animate: { transition: { staggerChildren: 0.06 } } };
const itemFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

// ─── Backend URL ──────────────────────────────────────────────────────────────
// Priority: VITE_BACKEND_URL env var → auto-detect Codespace port → localhost
const BACKEND = (() => {
  const env = (import.meta as any)?.env?.VITE_BACKEND_URL as string | undefined;
  if (env) return env;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h.includes(".app.github.dev"))
      return window.location.origin.replace(/-\d+(\.preview)?\.app\.github\.dev/, "-5000.app.github.dev");
  }
  return "http://localhost:5000";
})();

// ─── API Helpers ──────────────────────────────────────────────────────────────

/** Parses a Gemini reply that may be plain text, raw JSON, or text + ```json block. */
function parseAI(raw: string): ParsedAI | null {
  if (!raw) return null;
  let json = "";
  let chatText = raw.trim();
  const fence = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fence) { json = fence[1].trim(); chatText = raw.slice(0, fence.index).trim(); }
  else {
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s !== -1 && e > s) { json = raw.slice(s, e + 1); chatText = raw.slice(0, s).trim(); }
  }
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    if (!p.verdict || !p.range || !p.breakdown) return null;
    return { chatText: chatText || p.note || p.verdict, verdict: p.verdict, valid: Boolean(p.valid), range: p.range, breakdown: p.breakdown };
  } catch { return null; }
}

/** Initiates Monnify checkout — redirects the browser on success. */
async function checkout(amount: number, email: string, jobId: string) {
  const r = await fetch(`${BACKEND}/pay`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, email, jobId }),
  });
  const d = await r.json();
  if (!d.checkoutUrl) throw new Error(d.error || "No checkoutUrl");
  window.location.href = d.checkoutUrl;
}

/** Triggers a Monnify disbursement (escrow release or withdrawal). */
async function payout(amount: number, jobId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await fetch(`${BACKEND}/payout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, jobId }),
    });
    const d = await r.json();
    return { ok: r.ok, message: d.message || (r.ok ? "Done" : "Failed") };
  } catch { return { ok: false, message: "Could not reach backend" }; }
}

// ─── Primitive Components ─────────────────────────────────────────────────────

function Spinner({ size = 16, color = T.gold }: { size?: number; color?: string }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />;
}

function Badge({ children, variant = "gold" }: { children: ReactNode; variant?: "gold"|"green"|"red"|"amber"|"muted" }) {
  const map = { gold: [T.goldl, T.gold], green: [T.greenl, T.green], red: [T.redl, T.red], amber: [T.amberl, T.amber], muted: ["rgba(255,255,255,0.05)", T.t2] };
  const [bg, color] = map[variant];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: bg, color, border: `1px solid ${color}22`, display: "inline-flex", alignItems: "center" }}>{children}</span>;
}

function Avatar({ initials, size = 36, variant = "gold" }: { initials: string; size?: number; variant?: "gold"|"green"|"muted" }) {
  const bgs = { gold: `linear-gradient(135deg,${T.gold},${T.goldd})`, green: `linear-gradient(135deg,${T.green},#1A9068)`, muted: "rgba(255,255,255,0.06)" };
  return <div style={{ width: size, height: size, borderRadius: "50%", background: bgs[variant], flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: variant === "muted" ? T.t2 : "#0B0F17", fontSize: size * 0.34, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{initials}</div>;
}

function Card({ children, style = {}, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return <motion.div onClick={onClick} whileHover={onClick ? { scale: 1.005 } : {}} style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: 24, position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : undefined, ...style }}>{children}</motion.div>;
}

function Divider({ style = {} }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: T.bdr, ...style }} />;
}

function BtnPrimary({ children, onClick, disabled = false, loading = false, style = {} }: { children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; style?: React.CSSProperties }) {
  return (
    <motion.button onClick={onClick} disabled={disabled || loading} whileHover={{ scale: disabled ? 1 : 1.01 }} whileTap={{ scale: disabled ? 1 : 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ width: "100%", padding: "13px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: disabled ? "rgba(255,255,255,0.06)" : T.accent, color: disabled ? T.t3 : "#0B0F17", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, ...style }}>
      {loading ? <Spinner size={14} color="#0B0F17" /> : children}
    </motion.button>
  );
}

function BtnSecondary({ children, onClick, style = {} }: { children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return <motion.button onClick={onClick} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ padding: "11px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "rgba(255,255,255,0.05)", color: T.t1, border: `1px solid ${T.bdr2}`, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, ...style }}>{children}</motion.button>;
}

function BtnGhost({ children, onClick, style = {} }: { children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return <motion.button onClick={onClick} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, background: "transparent", color: T.t2, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 6, ...style }}>{children}</motion.button>;
}

function Input({ label, type = "text", placeholder, value, onChange, style = {} }: { label?: string; type?: string; placeholder?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; style?: React.CSSProperties }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <motion.div animate={{ boxShadow: foc ? `0 0 0 2px ${T.gold}40` : "none" }} style={{ borderRadius: 10 }}>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          style={{ width: "100%", padding: "12px 14px", border: `1px solid ${foc ? T.gold + "60" : T.bdr2}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: T.t1, background: T.surf2, outline: "none", ...style }} />
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = "gold" }: { label: string; value: string; sub?: string; accent?: "gold"|"green"|"red" }) {
  const c = { gold: T.gold, green: T.green, red: T.red }[accent];
  return (
    <motion.div variants={itemFade} style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c},${c}44)` }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>
      <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: c, fontWeight: 500 }}>{sub}</div>}
    </motion.div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: T.surf2, color: T.t1, padding: "11px 20px", borderRadius: 40, fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: "nowrap", pointerEvents: "none", border: `1px solid ${T.bdr2}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, flexShrink: 0, display: "inline-block" }} />
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Typed Word Hook ─────────────────────────────────────────────────────────
// Cycles through words with a typewriter + blinking-cursor effect.
function useTypedWord(words: string[], speed = 80, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [cursor, setCursor] = useState(true);
  const [wi, setWi] = useState(0);

  useEffect(() => {
    const word = words[wi];
    let i = 0;
    let typing = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (typing) {
        i++;
        setDisplay(word.slice(0, i));
        if (i < word.length) { timer = setTimeout(tick, speed); }
        else { timer = setTimeout(() => { typing = false; i = word.length; erase(); }, pause); }
      }
    };
    const erase = () => {
      i--;
      setDisplay(word.slice(0, i));
      if (i > 0) { timer = setTimeout(erase, speed / 2); }
      else { setWi((w) => (w + 1) % words.length); }
    };

    timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [wi]);

  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 500);
    return () => clearInterval(t);
  }, []);

  return { display, cursor };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ARTISAN_NAV = [
  { id: "dashboard" as Section, label: "Dashboard",    icon: "◉" },
  { id: "jobs"      as Section, label: "Jobs",         icon: "⬡" },
  { id: "pricing"   as Section, label: "Price Advisor",icon: "◈" },
  { id: "bidding"   as Section, label: "Open Bids",    icon: "◎" },
  { id: "wallet"    as Section, label: "Wallet",       icon: "◇" },
  { id: "messages"  as Section, label: "Messages",     icon: "◫" },
  { id: "tracker"   as Section, label: "AI Tracker",   icon: "◆" },
  { id: "profile"   as Section, label: "Profile",      icon: "◯" },
];
const CLIENT_NAV = [
  { id: "dashboard" as Section, label: "Dashboard", icon: "◉" },
  { id: "jobs"      as Section, label: "My Jobs",   icon: "⬡" },
  { id: "wallet"    as Section, label: "Wallet",    icon: "◇" },
  { id: "messages"  as Section, label: "Messages",  icon: "◫" },
  { id: "profile"   as Section, label: "Profile",   icon: "◯" },
];

function Sidebar({ role, active, onNav, onLogout }: { role: Role; active: Section; onNav: (s: Section) => void; onLogout: () => void }) {
  const nav = role === "artisan" ? ARTISAN_NAV : CLIENT_NAV;
  return (
    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" as const }}
      style={{ width: 220, flexShrink: 0, height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", background: T.surf, borderRight: `1px solid ${T.bdr}`, padding: "24px 16px", zIndex: 10 }}>
      <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: T.t1, paddingLeft: 8, marginBottom: 32, letterSpacing: "-0.03em" }}>
        Deal<span style={{ color: T.gold }}>r</span>
      </div>
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map(({ id, label, icon }) => {
          const on = active === id;
          return (
            <motion.button key={id} onClick={() => onNav(id)} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13.5, fontWeight: on ? 600 : 400, color: on ? T.gold : T.t2, background: on ? T.goldl : "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left", position: "relative" }}>
              <span style={{ fontSize: 14, opacity: on ? 1 : 0.6 }}>{icon}</span>
              {label}
              {on && <motion.div layoutId="indicator" style={{ position: "absolute", right: 16, width: 3, height: 18, background: T.gold, borderRadius: 2 }} />}
            </motion.button>
          );
        })}
      </nav>
      <div>
        <Divider style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 12 }}>
          <Avatar initials={role === "artisan" ? "KA" : "BA"} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{role === "artisan" ? "Kehinde A." : "Bola A."}</div>
            <Badge variant="muted">{role}</Badge>
          </div>
        </div>
        <BtnGhost onClick={onLogout} style={{ width: "100%", justifyContent: "flex-start", paddingLeft: 12 }}>Sign out</BtnGhost>
      </div>
    </motion.div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

function AuthPage({ onLogin }: { onLogin: (r: Role) => void }) {
  const [role, setRole] = useState<Role>("artisan");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const { display, cursor } = useTypedWord(["artisan", "entrepreneur", "creative", "innovator"]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left */}
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" as const }}
        style={{ flex: 1, background: "linear-gradient(160deg,#141A26 0%,#0B0F17 100%)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 72px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, left: -80, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle,${T.gold}18 0%,transparent 70%)`, pointerEvents: "none" }} />
        <div className="syne" style={{ fontSize: 44, fontWeight: 800, color: T.t1, letterSpacing: "-0.04em", marginBottom: 16, lineHeight: 1.1 }}>
          Deal<span style={{ color: T.gold }}>r.</span>
        </div>
        <div style={{ fontSize: 16, color: T.t2, lineHeight: 1.75, maxWidth: 320, marginBottom: 48 }}>
          Deals done right, Every time.<br />
          For every{" "}
          <span style={{ color: T.gold }}>
            {display}
            <span style={{ animation: "blink 1s step-end infinite", opacity: cursor ? 1 : 0 }}>|</span>
          </span>
          .
        </div>
        <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {["AI-verified market pricing", "Monnify escrow — pay only after delivery", "Multi-currency withdrawal", "Live bidding on open jobs"].map((f) => (
            <motion.div key={f} variants={itemFade} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: T.goldl, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: T.gold, fontSize: 10, fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ fontSize: 14, color: T.t2, lineHeight: 1.5 }}>{f}</span>
            </motion.div>
          ))}
        </motion.div>
        <div style={{ position: "absolute", bottom: 32, left: 72, fontSize: 11, color: T.t3, letterSpacing: "0.04em" }}>Powered by Monnify</div>
      </motion.div>

      {/* Right */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
        style={{ width: 480, display: "flex", alignItems: "center", justifyContent: "center", padding: 48, background: T.surf, borderLeft: `1px solid ${T.bdr}` }}>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, marginBottom: 6, letterSpacing: "-0.02em" }}>Welcome back</div>
          <div style={{ fontSize: 14, color: T.t2, marginBottom: 32 }}>Dealr.</div>
          <div style={{ display: "flex", borderRadius: 10, padding: 4, marginBottom: 28, gap: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.bdr}` }}>
            {(["artisan", "client"] as Role[]).map((r) => (
              <motion.button key={r} onClick={() => setRole(r)} whileTap={{ scale: 0.97 }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontSize: 13, fontWeight: 600, background: role === r ? T.goldl : "transparent", color: role === r ? T.gold : T.t3, border: role === r ? `1px solid ${T.gold}30` : "1px solid transparent", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
                {r}
              </motion.button>
            ))}
          </div>
          <Input label="Email"    type="email"    placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="••••••••"        value={pass}  onChange={(e) => setPass(e.target.value)} />
          <BtnPrimary onClick={() => onLogin(role)} style={{ marginBottom: 16, marginTop: 4 }}>Continue</BtnPrimary>
          <div style={{ textAlign: "center", fontSize: 13, color: T.t3 }}>
            No account? <span onClick={() => onLogin(role)} style={{ color: T.gold, fontWeight: 600, cursor: "pointer" }}>Sign up free</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function OnboardingPage({ role, onComplete }: { role: Role; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", location: "", skills: "", experience: "", purpose: "" });
  const upd = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const steps = role === "artisan" ? ["Basic Info", "Your Skills", "Done"] : ["Basic Info", "Your Needs", "Done"];
  const isLast = step === steps.length - 1;

  const content = role === "artisan" ? [
    <><Input label="Full Name" placeholder="Kehinde Adeyemi" value={f.name}     onChange={(e) => upd("name", e.target.value)} /><Input label="Location" placeholder="e.g. Surulere, Lagos" value={f.location} onChange={(e) => upd("location", e.target.value)} /></>,
    <><Input label="Trade / Skills" placeholder="e.g. Tailor, Welder, MUA"     value={f.skills}     onChange={(e) => upd("skills", e.target.value)} /><Input label="Years of Experience" placeholder="e.g. 5" value={f.experience} onChange={(e) => upd("experience", e.target.value)} /></>,
    <div style={{ textAlign: "center", padding: "24px 0" }}><div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div><div className="syne" style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginBottom: 8 }}>You're all set, {f.name || "Artisan"}!</div><div style={{ fontSize: 14, color: T.t2 }}>Your Dealr profile is ready.</div></div>,
  ] : [
    <><Input label="Full Name" placeholder="Bola Adesanya" value={f.name} onChange={(e) => upd("name", e.target.value)} /><Input label="Location" placeholder="e.g. Victoria Island, Lagos" value={f.location} onChange={(e) => upd("location", e.target.value)} /></>,
    <Input label="What do you mainly hire for?" placeholder="e.g. tailoring, welding, events..." value={f.purpose} onChange={(e) => upd("purpose", e.target.value)} />,
    <div style={{ textAlign: "center", padding: "24px 0" }}><div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div><div className="syne" style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginBottom: 8 }}>Welcome, {f.name || "Client"}!</div><div style={{ fontSize: 14, color: T.t2 }}>Post a job and pay only after delivery.</div></div>,
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div className="syne" style={{ textAlign: "center", fontSize: 26, fontWeight: 800, color: T.t1, marginBottom: 8, letterSpacing: "-0.03em" }}>Deal<span style={{ color: T.gold }}>r</span></div>
        <div style={{ fontSize: 14, color: T.t2, textAlign: "center", marginBottom: 36 }}>Let's set up your profile</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <motion.div animate={{ background: i <= step ? T.gold : "rgba(255,255,255,0.08)" }} style={{ height: 3, borderRadius: 2, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: i <= step ? T.gold : T.t3, fontWeight: i === step ? 600 : 400 }}>{s}</div>
            </div>
          ))}
        </div>
        <Card style={{ padding: 32 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} {...fadeUp}>{content[step]}</motion.div>
          </AnimatePresence>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 0 && !isLast && <BtnSecondary onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>Back</BtnSecondary>}
            <BtnPrimary onClick={isLast ? onComplete : () => setStep((s) => s + 1)} style={{ flex: 1 }}>{isLast ? "Get Started" : "Continue"}</BtnPrimary>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function JobRow({ desc, meta, amt, st, onClick }: JobItem & { onClick?: () => void }) {
  const status = { escrow: { label: "In Escrow", variant: "gold" as const }, pending: { label: "Pending", variant: "amber" as const }, done: { label: "Paid", variant: "green" as const } }[st];
  return (
    <motion.div onClick={onClick} whileHover={{ x: 2 }}
      style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: onClick ? "pointer" : "default" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.t1, marginBottom: 3 }}>{desc}</div>
        <div style={{ fontSize: 12, color: T.t3 }}>{meta}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{amt}</div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
    </motion.div>
  );
}

function DashboardSection({ role, onNav }: { role: Role; onNav: (s: Section) => void }) {
  const ia = role === "artisan";
  const jobs: JobItem[] = [
    { desc: "Senator kaftan with hand embroidery", meta: ia ? "Bola A. · Due tomorrow"   : "Kehinde Adeyemi · Due tomorrow", amt: "₦21,000", st: "escrow"  },
    { desc: "Birthday decoration — 200 guests",    meta: ia ? "Tunde M. · Due Friday"    : "Zainab Events · Due Friday",     amt: "₦55,000", st: "pending" },
    { desc: "Compound gate welding — 3.5m",        meta: ia ? "Ngozi O. · Completed"     : "Seun Builders · Completed",      amt: "₦38,000", st: "done"    },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={itemFade} style={{ marginBottom: 32 }}>
        <div className="syne" style={{ fontSize: 28, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Good morning, {ia ? "Kehinde" : "Bola"} 👋</div>
        <div style={{ fontSize: 14, color: T.t2 }}>{ia ? "You have 2 active jobs and 1 new bid." : "You have 2 active jobs in escrow."}</div>
      </motion.div>
      <motion.div variants={itemFade} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {ia ? (
          <><StatCard label="Available" value="₦84,500" sub="↑ ₦21k this week" accent="gold" /><StatCard label="In Escrow" value="₦38,000" sub="2 active jobs" accent="green" /><StatCard label="Win Rate" value="67%" sub="↑ 12% this month" accent="green" /></>
        ) : (
          <><StatCard label="Total Spent" value="₦80,000" sub="4 jobs done" accent="gold" /><StatCard label="In Escrow" value="₦38,000" sub="2 active jobs" accent="green" /><StatCard label="Disputes" value="0" sub="Clean record" accent="green" /></>
        )}
      </motion.div>
      <motion.div variants={itemFade} style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {ia ? (<><BtnPrimary onClick={() => onNav("jobs")} style={{ width: "auto", padding: "11px 24px" }}>+ Create Job</BtnPrimary><BtnSecondary onClick={() => onNav("pricing")}>Price Advisor</BtnSecondary><BtnSecondary onClick={() => onNav("bidding")}>Open Bids</BtnSecondary></>) : (<><BtnPrimary onClick={() => onNav("jobs")} style={{ width: "auto", padding: "11px 24px" }}>View Jobs</BtnPrimary><BtnSecondary onClick={() => onNav("messages")}>Messages</BtnSecondary></>)}
      </motion.div>
      <motion.div variants={itemFade}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Recent Jobs</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{jobs.map((j, i) => <JobRow key={i} {...j} />)}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Price Advisor ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "Bridal makeup ₦120k", text: "I want to charge ₦120,000 for bridal makeup at 8am in 2 days. Fair?" },
  { label: "Kaftan ₦35k",         text: "Senator kaftan with embroidery at ₦35,000. Is that fair?" },
  { label: "Gate welding ₦65k",   text: "Gate welding 3.5m wide, charging ₦65,000. Too much?" },
  { label: "Decoration ₦80k",     text: "Event decoration for 150 guests, ₦80,000. Good price?" },
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "12px 14px", background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: T.t3, animation: "pulse 1s infinite", animationDelay: `${i * 0.15}s` }} />)}
    </div>
  );
}

function PricingSection() {
 const [msgs, setMsgs] = useState<ChatMsg[]>([{ type: "bot", text: "Tell me about the job you want to price. For example: I want to charge ₦120,000 for bridal makeup at 8am in 2 days. Is that fair?" }]);
  const [input,  setInput]  = useState("");
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs, typing]);

  const send = async (text?: string) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    setMsgs((p) => [...p, { type: "user", text: t }]);
    setTyping(true);
    try {
      // POST /price — expects { reply: string } from Gemini via backend
      const res  = await fetch(`${BACKEND}/price`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: t }) });
      const data = await res.json();
      const parsed = parseAI(data.reply);
      if (!parsed) throw new Error("unparseable");
      setMsgs((p) => [...p, { type: "bot", text: parsed.chatText, breakdown: parsed.breakdown, range: parsed.range, valid: parsed.valid, verdict: parsed.verdict }]);
    } catch {
      setMsgs((p) => [...p, { type: "bot", text: "Couldn't reach the AI right now. Try again in a moment." }]);
    } finally { setTyping(false); }
  };

  return (
    <motion.div {...fadeUp}>
      <div style={{ marginBottom: 24 }}>
        <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 6 }}>Price Advisor</div>
        <div style={{ fontSize: 14, color: T.t2 }}>Describe your job and proposed price. I'll verify it against the Nigerian market.</div>
      </div>
      <Card style={{ display: "flex", flexDirection: "column", height: 560, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.goldl, border: `1px solid ${T.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>◈</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>Dealr Price Advisor</div>
            <div style={{ fontSize: 12, color: T.green, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
              Dealr AI · Online
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                style={{ maxWidth: "80%", alignSelf: m.type === "user" ? "flex-end" : "flex-start", display: "flex", flexDirection: "column", gap: 6, alignItems: m.type === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ padding: "11px 14px", fontSize: 13.5, lineHeight: 1.6, borderRadius: m.type === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.type === "user" ? `linear-gradient(135deg,${T.gold},${T.goldd})` : T.surf2, color: m.type === "user" ? "#0B0F17" : T.t1, border: m.type === "bot" ? `1px solid ${T.bdr}` : "none" }}>{m.text}</div>
                {m.breakdown && (
                  <div style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 14, maxWidth: 300, width: "100%" }}>
                    {Object.entries(m.breakdown).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: T.t2, borderBottom: `1px solid ${T.bdr}` }}>
                        <span>{k}</span><span className="mono" style={{ color: T.t1 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: 600, fontSize: 12 }}>
                      <span style={{ color: T.t1 }}>Market range</span>
                      <span className="mono" style={{ color: T.gold }}>{m.range}</span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Badge variant={m.valid ? "green" : "red"}>{m.valid ? "✓ Fair Price" : "⚠ Adjust Price"} — {m.verdict}</Badge>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 10, color: T.t3 }}>Just now</div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && <TypingDots />}
        </div>

        {/* Quick chips */}
        <div style={{ padding: "0 16px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_PROMPTS.map((q) => (
            <motion.button key={q.label} whileTap={{ scale: 0.96 }} onClick={() => send(q.text)}
              style={{ fontSize: 11, padding: "5px 12px", background: T.goldl, color: T.gold, borderRadius: 20, border: `1px solid ${T.gold}30`, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
              {q.label}
            </motion.button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 8, alignItems: "center" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Describe your job and proposed price..."
            style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.bdr2}`, borderRadius: 30, fontSize: 13.5, fontFamily: "inherit", color: T.t1, background: T.surf2, outline: "none" }} />
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => send()}
            style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${T.gold},${T.goldd})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0F17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Jobs Section ─────────────────────────────────────────────────────────────

function JobsSection({ role, showToast }: { role: Role; showToast: ToastFn }) {
  const [filter,     setFilter]     = useState("all");
  const [jobDesc,    setJobDesc]    = useState("");
  const [generating, setGenerating] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [busy,       setBusy]       = useState<string | null>(null);
  const ia = role === "artisan";

  const jobs: JobItem[] = [
    { desc: "Senator kaftan with hand embroidery", meta: ia ? "Bola A. · Due tomorrow"   : "Kehinde Adeyemi · Due tomorrow", amt: "₦21,000", st: "escrow"  },
    { desc: "Birthday decoration — 200 guests",    meta: ia ? "Tunde M. · Due Friday"    : "Zainab Events · Due Friday",     amt: "₦55,000", st: "pending" },
    { desc: "Compound gate welding — 3.5m",        meta: ia ? "Ngozi O. · Completed"     : "Seun Builders · Completed",      amt: "₦38,000", st: "done"    },
    { desc: "Traditional wedding hair & makeup",   meta: ia ? "Amaka I. · Completed"     : "Amaka I. · Completed",           amt: "₦42,000", st: "done"    },
  ];
  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.st === filter);
  const genPrice = () => { if (!jobDesc.trim()) return; setGenerating(true); setTimeout(() => { setGenerating(false); setShowOutput(true); }, 2200); };

  if (showOutput) return (
    <motion.div {...fadeUp}>
      <BtnGhost onClick={() => setShowOutput(false)} style={{ marginBottom: 20 }}>← Edit Job</BtnGhost>
      <Card style={{ maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Market range: ₦18,000 – ₦24,000</div>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="syne mono" style={{ fontSize: 52, fontWeight: 800, color: T.gold, lineHeight: 1, marginBottom: 6 }}>₦21,000</motion.div>
          <div style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>AI Recommended Price</div>
        </div>
        <Divider style={{ marginBottom: 20 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Cost Breakdown</div>
        {[["Materials & fabric","₦5,000"],["Labour & skill","₦7,200"],["Overhead & urgency","₦1,220"],["Complexity","₦2,580"]].map(([k, v], i) => (
          <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
            style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.bdr}`, fontSize: 14 }}>
            <span style={{ color: T.t2 }}>{k}</span><span className="mono" style={{ fontWeight: 600, color: T.t1 }}>{v}</span>
          </motion.div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 700, fontSize: 14 }}>
          <span style={{ color: T.t1 }}>Total</span><span className="mono" style={{ color: T.gold, fontSize: 16 }}>₦21,000</span>
        </div>
        <Divider style={{ margin: "8px 0 20px" }} />
        <div style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 13, color: T.t2, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: T.t3, marginBottom: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Auto-Generated Agreement</div>
          — Artisan agrees to complete the described job.<br />
          — Delivery within 4 days of payment confirmation.<br />
          — ₦21,000 held in Monnify escrow until delivery confirmed.<br />
          — Either party may raise a dispute within 48 hours.
        </div>
        {/* Calls POST /pay → backend creates Monnify transaction → returns checkoutUrl → browser redirect */}
        <BtnPrimary loading={busy === "pay"} onClick={async () => {
          setBusy("pay");
          try { await checkout(21000, "client@example.com", `JOB_${Date.now()}`); }
          catch { showToast("Could not start checkout — please try again"); }
          finally { setBusy(null); }
        }}>Confirm & Send to Client →</BtnPrimary>
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: T.t3 }}>Client is redirected to Monnify's secure checkout</div>
      </Card>
    </motion.div>
  );

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={itemFade} style={{ marginBottom: 24 }}>
        <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>My Jobs</div>
        <div style={{ fontSize: 14, color: T.t2 }}>{ia ? "Manage active and past jobs." : "Track jobs, confirm delivery, release payments."}</div>
      </motion.div>

      {/* Artisan: create job + AI price */}
      {ia && (
        <motion.div variants={itemFade}>
          <Card style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 14 }}>Create New Job</div>
            <textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Describe the job in plain English or Pidgin..."
              style={{ width: "100%", minHeight: 100, padding: 14, border: `1px solid ${T.bdr2}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: T.t1, background: T.surf2, resize: "vertical", outline: "none", lineHeight: 1.6, marginBottom: 12 }} />
            {generating && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
                <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  style={{ height: "100%", width: "50%", background: `linear-gradient(90deg,transparent,${T.gold},transparent)`, borderRadius: 2 }} />
              </div>
            )}
            <BtnPrimary onClick={genPrice} disabled={generating}>{generating ? "Generating..." : "Generate Price with AI"}</BtnPrimary>
          </Card>
        </motion.div>
      )}

      {/* Filter tabs */}
      <motion.div variants={itemFade} style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[["all","All"],["escrow","In Escrow"],["pending","Pending"],["done","Completed"]].map(([v, l]) => (
          <motion.button key={v} onClick={() => setFilter(v)} whileTap={{ scale: 0.97 }}
            style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: `1px solid ${filter === v ? T.gold + "60" : T.bdr}`, background: filter === v ? T.goldl : "transparent", color: filter === v ? T.gold : T.t2, cursor: "pointer", fontFamily: "inherit" }}>
            {l}
          </motion.button>
        ))}
      </motion.div>

      <motion.div variants={stagger} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <AnimatePresence mode="popLayout">
          {filtered.map((j, i) => {
            // Client view: active jobs show confirm/dispute buttons
            if (!ia && j.st !== "done") {
              const key = `deliver-${i}`;
              return (
                <motion.div key={i} variants={itemFade} layout
                  style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div><div style={{ fontSize: 14, fontWeight: 500, color: T.t1, marginBottom: 3 }}>{j.desc}</div><div style={{ fontSize: 12, color: T.t3 }}>{j.meta}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{j.amt}</span>
                    {/* Calls POST /payout → backend triggers Monnify disbursement to artisan */}
                    <motion.button whileTap={{ scale: 0.96 }} disabled={busy === key}
                      onClick={async () => {
                        setBusy(key);
                        const amtNum = Number(j.amt.replace(/[^\d]/g, ""));
                        const r = await payout(amtNum, `JOB_${i}`);
                        showToast(r.ok ? `Delivery confirmed. ${j.amt} released to artisan.` : r.message);
                        setBusy(null);
                      }}
                      style={{ padding: "7px 14px", borderRadius: 8, background: T.greenl, color: T.green, border: `1px solid ${T.green}30`, fontSize: 12, fontWeight: 600, cursor: busy === key ? "default" : "pointer", fontFamily: "inherit", opacity: busy === key ? 0.6 : 1 }}>
                      {busy === key ? "Releasing…" : "✓ Confirm Delivery"}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} style={{ padding: "7px 14px", borderRadius: 8, background: "transparent", color: T.red, border: `1px solid ${T.red}30`, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Dispute</motion.button>
                  </div>
                </motion.div>
              );
            }
            return <motion.div key={i} variants={itemFade} layout><JobRow {...j} /></motion.div>;
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Bidding ──────────────────────────────────────────────────────────────────

function BiddingSection({ showToast }: { showToast: ToastFn }) {
  const [bids, setBids] = useState<Record<string,string>>({ b0:"", b1:"", b2:"" });

  const BIDS = [
    { title:"Bridal makeup — 2 people, Saturday 7am",   client:"Chioma A. · Lagos Island", budget:"₦80,000 – ₦120,000", count:7,  lowest:"₦92,000",  desc:"Professional MUA for two bridesmaids. Traditional Yoruba wedding. 8+ hours wear.", live:true  },
    { title:"Agbada stitching — 3 sets, plain fabric",  client:"Emeka N. · Abuja",          budget:"₦30,000 – ₦55,000",  count:3,  lowest:"₦41,000",  desc:"3 plain agbada stitched — fabric provided. Abuja delivery within 5 days.",         live:true  },
    { title:"Compound painting — 4-bedroom bungalow",   client:"Funmi L. · Ibadan",         budget:"₦120,000 – ₦200,000",count:12, lowest:"₦148,000", desc:"External and internal painting. Client supplies paint. 7-day job.",                live:false },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={itemFade} style={{ marginBottom: 28 }}>
        <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Open Bids</div>
        <div style={{ fontSize: 14, color: T.t2 }}>Clients post jobs. You bid your price. Lowest fair bid wins — secured by escrow.</div>
      </motion.div>
      {BIDS.map((b, i) => (
        <motion.div key={i} variants={itemFade}>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div><div style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 4 }}>{b.title}</div><div style={{ fontSize: 12, color: T.t3 }}>{b.client}</div></div>
              <Badge variant={b.live ? "red" : "amber"}><span style={{ animation: b.live ? "pulse 1.5s infinite" : "none", display: "inline-block" }}>●</span>{" "}{b.live ? "Live" : "Closing"}</Badge>
            </div>
            <div style={{ fontSize: 13.5, color: T.t2, lineHeight: 1.65, marginBottom: 16 }}>{b.desc}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>Budget: {b.budget}</div>
              <div style={{ fontSize: 12, color: T.t3 }}>{b.count} bids placed</div>
            </div>
            <div style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: T.t3 }}>Current lowest bid</div>
              <div className="mono syne" style={{ fontSize: 22, fontWeight: 700, color: T.gold }}>{b.lowest}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={bids[`b${i}`]} onChange={(e) => setBids((p) => ({ ...p, [`b${i}`]: e.target.value }))} type="number" placeholder="Your bid in ₦"
                style={{ flex: 1, padding: "10px 13px", border: `1px solid ${T.bdr2}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: T.t1, background: T.surf2, outline: "none" }} />
              <BtnPrimary onClick={() => { if (bids[`b${i}`]) { showToast(`Bid of ₦${Number(bids[`b${i}`]).toLocaleString()} placed`); setBids((p) => ({ ...p, [`b${i}`]: "" })); } }} style={{ width: "auto", padding: "10px 20px" }}>Place Bid</BtnPrimary>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

function WalletSection({ showToast }: { showToast: ToastFn }) {
  const [curr, setCurr] = useState("NGN");
  const [amt,  setAmt]  = useState("0");
  const [bank, setBank] = useState(0);
  const [busy, setBusy] = useState(false);

  const CURRENCIES = [
    { code:"NGN", sym:"₦",  flag:"🇳🇬" }, { code:"USD", sym:"$",   flag:"🇺🇸" }, { code:"GBP", sym:"£",  flag:"🇬🇧" },
    { code:"EUR", sym:"€",  flag:"🇪🇺" }, { code:"CAD", sym:"C$",  flag:"🇨🇦" }, { code:"USDT",sym:"₮",  flag:"₮"   },
  ];
  const BANKS = [{ name:"Guaranty Trust Bank", num:"**** 4521", init:"GT" }, { name:"OPay", num:"**** 8830", init:"OP" }];
  const TXNS  = [
    { desc:"Senator kaftan — Bola A.",     amt:"+₦21,000", date:"Today, 2:14pm",       type:"in"  },
    { desc:"Withdrawal to GTBank",          amt:"-₦15,000", date:"Yesterday, 10:30am",  type:"out" },
    { desc:"Compound gate — Ngozi O.",      amt:"+₦38,000", date:"2 days ago",          type:"in"  },
    { desc:"Withdrawal to GTBank",          amt:"-₦30,000", date:"3 days ago",          type:"out" },
    { desc:"Wedding makeup — Amaka I.",     amt:"+₦42,000", date:"5 days ago",          type:"in"  },
  ];

  const cur    = CURRENCIES.find((c) => c.code === curr) || CURRENCIES[0];
  const numAmt = Number(amt);
  const numPress = (v: string) => {
    if (v === "del") setAmt((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
    else setAmt((p) => { if (p === "0" && v !== "000") return v; if (p.length >= 10) return p; return p + v; });
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={itemFade} style={{ marginBottom: 24 }}>
        <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>Wallet</div>
        <div style={{ fontSize: 14, color: T.t2 }}>Manage your balance, escrow, and withdrawals.</div>
      </motion.div>

      {/* Balance cards */}
      <motion.div variants={itemFade} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[{ label:"Available Balance", val:"₦84,500", sub:"↑ +₦21,000 this week", accent:T.gold }, { label:"In Escrow", val:"₦38,000", sub:"2 active jobs", accent:T.green }].map(({ label, val, sub, accent }) => (
          <div key={label} style={{ background:"linear-gradient(135deg,#1A2030,#141B28)", border:`1px solid ${accent}22`, borderRadius:16, padding:22, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:`radial-gradient(circle,${accent}20 0%,transparent 70%)` }} />
            <div style={{ fontSize:11, color:T.t3, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>{label}</div>
            <div className="mono syne" style={{ fontSize:32, fontWeight:700, color:accent, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:12, color:label === "In Escrow" ? T.t3 : T.green }}>{sub}</div>
          </div>
        ))}
      </motion.div>

      {/* Withdraw card */}
      <motion.div variants={itemFade}>
        <Card style={{ marginBottom: 24, maxWidth: 500 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 20 }}>Withdraw Funds</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: 20 }}>
            {CURRENCIES.map((c) => (
              <motion.button key={c.code} onClick={() => setCurr(c.code)} whileTap={{ scale: 0.94 }}
                style={{ padding: "8px 4px", borderRadius: 8, fontSize: 10, fontWeight: 600, border: `1px solid ${curr === c.code ? T.gold + "60" : T.bdr}`, background: curr === c.code ? T.goldl : "rgba(255,255,255,0.03)", color: curr === c.code ? T.gold : T.t3, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 16 }}>{c.flag}</span>{c.code}
              </motion.button>
            ))}
          </div>
          <motion.div key={amt} initial={{ opacity: 0.7, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "16px 0 20px" }}>
            <div className="mono syne" style={{ fontSize: 44, fontWeight: 700, color: T.t1, letterSpacing: "-0.03em" }}>
              <span style={{ fontSize: 20, color: T.t3, fontWeight: 400 }}>{cur.sym}</span>{numAmt.toLocaleString()}
            </div>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
            {["1","2","3","4","5","6","7","8","9","000","0","del"].map((v) => (
              <motion.button key={v} whileTap={{ scale: 0.92 }} onClick={() => numPress(v)}
                style={{ padding: 14, border: `1px solid ${T.bdr}`, borderRadius: 10, background: T.surf2, fontSize: v === "del" ? 16 : 18, fontWeight: 500, color: T.t1, cursor: "pointer", fontFamily: "inherit" }}>
                {v === "del" ? "⌫" : v}
              </motion.button>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            {BANKS.map((b, i) => (
              <motion.div key={i} onClick={() => setBank(i)} whileTap={{ scale: 0.99 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: `1px solid ${bank === i ? T.gold + "60" : T.bdr}`, borderRadius: 10, cursor: "pointer", marginBottom: 8, background: bank === i ? T.goldl : "rgba(255,255,255,0.02)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: T.goldl, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.gold }}>{b.init}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>{b.name}</div>
                  <div className="mono" style={{ fontSize: 12, color: T.t3 }}>{b.num}</div>
                </div>
                {bank === i && <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#0B0F17", fontSize: 10, fontWeight: 700 }}>✓</div>}
              </motion.div>
            ))}
          </div>
          {/* Calls POST /payout → Monnify disbursement to selected bank */}
          <BtnPrimary loading={busy} onClick={async () => {
            if (numAmt < 100) { showToast("Enter a valid amount"); return; }
            setBusy(true);
            const r = await payout(numAmt, `WITHDRAW_${Date.now()}`);
            showToast(r.ok ? `${cur.sym}${numAmt.toLocaleString()} withdrawal initiated` : r.message);
            if (r.ok) setAmt("0");
            setBusy(false);
          }}>Withdraw Now</BtnPrimary>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: T.t3 }}>Instant – 24h depending on bank · Powered by Monnify</div>
        </Card>
      </motion.div>

      {/* Transaction history */}
      <motion.div variants={itemFade}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 16 }}>Transaction History</div>
          {TXNS.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: i < TXNS.length - 1 ? `1px solid ${T.bdr}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.type === "in" ? T.greenl : T.redl, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{t.type === "in" ? "↓" : "↑"}</div>
                <div><div style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>{t.desc}</div><div style={{ fontSize: 12, color: T.t3 }}>{t.date}</div></div>
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: t.type === "in" ? T.green : T.red }}>{t.amt}</div>
            </div>
          ))}
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function MessagesSection() {
  const [active,   setActive]    = useState(0);
  const [msgInput, setMsgInput]  = useState("");
  const [thread,   setThread]    = useState([
    { out: false, text: "Hey Kehinde, just checking in — is the kaftan almost done?" },
    { out: true,  text: "Yes! Finishing the embroidery now. Ready by tomorrow morning." },
    { out: false, text: "Perfect. The escrow payment is already in." },
  ]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [thread]);

  const CONVS = [
    { name:"Bola Adesanya", init:"BA", preview:"Hey, is the kaftan almost done?", time:"2m",  unread:2 },
    { name:"Tunde Mahmoud", init:"TM", preview:"What time can you deliver?",      time:"1h",  unread:0 },
    { name:"Ngozi Okonkwo", init:"NO", preview:"Payment confirmed, thank you!",   time:"2d",  unread:0 },
  ];

  const sendMsg = () => { if (!msgInput.trim()) return; setThread((p) => [...p, { out: true, text: msgInput.trim() }]); setMsgInput(""); };

  return (
    <motion.div {...fadeUp} style={{ height: "calc(100vh - 96px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", border: `1px solid ${T.bdr}`, borderRadius: 16, overflow: "hidden", background: T.surf }}>
        {/* Conversation list */}
        <div style={{ borderRight: `1px solid ${T.bdr}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.bdr}` }}>
            <div className="syne" style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 10 }}>Messages</div>
            <input placeholder="Search..." style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: T.surf2, color: T.t1, outline: "none" }} />
          </div>
          {CONVS.map((c, i) => (
            <motion.div key={i} onClick={() => setActive(i)} whileHover={{ background: "rgba(255,255,255,0.03)" }}
              style={{ display: "flex", gap: 10, padding: 14, cursor: "pointer", borderBottom: `1px solid ${T.bdr}`, background: active === i ? T.goldl : "transparent", alignItems: "flex-start" }}>
              <Avatar initials={c.init} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: active === i ? T.gold : T.t1 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{c.time}</div>
                </div>
                <div style={{ fontSize: 12, color: T.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.preview}</div>
              </div>
              {c.unread > 0 && <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.gold, color: "#0B0F17", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.unread}</div>}
            </motion.div>
          ))}
        </div>

        {/* Thread */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.bdr}`, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={CONVS[active].init} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>{CONVS[active].name}</div>
              <div style={{ fontSize: 12, color: T.green, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} /> Online</div>
            </div>
            <BtnSecondary style={{ padding: "7px 14px", fontSize: 12 }}>View Job</BtnSecondary>
          </div>
          <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <AnimatePresence initial={false}>
              {thread.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: m.out ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                  <div style={{ padding: "10px 14px", fontSize: 14, lineHeight: 1.55, borderRadius: m.out ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.out ? `linear-gradient(135deg,${T.gold},${T.goldd})` : T.surf2, color: m.out ? "#0B0F17" : T.t1, border: m.out ? "none" : `1px solid ${T.bdr}` }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: T.t3, marginTop: 4, textAlign: m.out ? "right" : "left" }}>Just now</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} placeholder="Type a message..."
              style={{ flex: 1, padding: "10px 16px", border: `1px solid ${T.bdr2}`, borderRadius: 30, fontSize: 14, fontFamily: "inherit", color: T.t1, background: T.surf2, outline: "none" }} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={sendMsg} style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${T.gold},${T.goldd})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0F17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tracker ──────────────────────────────────────────────────────────────────

function TrackerSection() {
  const APPS = [
    { job:"Senator kaftan + embroidery",    client:"Bola A.",   amt:"₦21,000", status:"Won",       variant:"green" as const },
    { job:"Event decoration — 200 guests",  client:"Tunde M.",  amt:"₦55,000", status:"In Review", variant:"amber" as const },
    { job:"Compound gate welding",           client:"Emeka N.",  amt:"₦38,000", status:"Outbid",    variant:"red"   as const },
    { job:"Bridal makeup — 3 people",        client:"Chioma A.", amt:"₦90,000", status:"Applied",   variant:"gold"  as const },
  ];
  const SKILLS = [{ skill:"Digital invoicing", pct:30 }, { skill:"Client communication", pct:60 }, { skill:"Project photos/portfolio", pct:45 }];
  const ROADMAP = [
    { step:"Upload 3 portfolio photos",     done:true  },
    { step:"Get your first 5-star review",  done:true  },
    { step:"Complete your profile skills",  done:false },
    { step:"Enable digital invoicing",      done:false },
    { step:"Bid on 10 jobs",                done:false },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={itemFade} style={{ marginBottom: 28 }}>
        <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>AI Job Tracker</div>
        <div style={{ fontSize: 14, color: T.t2 }}>Track applications, win rates, and get personalised improvement suggestions.</div>
      </motion.div>
      <motion.div variants={itemFade} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Win Rate"     value="67%"  sub="↑ 12% this month" accent="green" />
        <StatCard label="Applications" value="12"   sub="4 this week"      accent="gold"  />
        <StatCard label="Avg. Bid"     value="₦51k" sub="Above market avg." accent="gold"  />
      </motion.div>
      <motion.div variants={itemFade}>
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 16 }}>Recent Applications</div>
          {APPS.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < APPS.length - 1 ? `1px solid ${T.bdr}` : "none" }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: T.t1, marginBottom: 2 }}>{a.job}</div><div className="mono" style={{ fontSize: 12, color: T.t3 }}>{a.client} · {a.amt}</div></div>
              <Badge variant={a.variant}>{a.status}</Badge>
            </div>
          ))}
        </Card>
      </motion.div>
      <motion.div variants={itemFade}>
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 4 }}>Skill Gap Analysis</div>
          <div style={{ fontSize: 13, color: T.t2, marginBottom: 20 }}>AI suggests these improvements to increase your win rate.</div>
          {SKILLS.map((s, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: T.t1 }}>{s.skill}</span><span className="mono" style={{ color: T.t3 }}>{s.pct}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" as const }}
                  style={{ height: "100%", background: `linear-gradient(90deg,${T.gold},${T.goldd})`, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </Card>
      </motion.div>
      <motion.div variants={itemFade}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 16 }}>Improvement Roadmap</div>
          {ROADMAP.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: i < ROADMAP.length - 1 ? `1px solid ${T.bdr}` : "none", alignItems: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${r.done ? T.green : T.bdr2}`, background: r.done ? T.greenl : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {r.done && <span style={{ color: T.green, fontSize: 10, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, color: r.done ? T.t3 : T.t1, textDecoration: r.done ? "line-through" : "none" }}>{r.step}</span>
            </div>
          ))}
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection({ role }: { role: Role }) {
  const ia = role === "artisan";
  const stats = ia ? [["₦156k","Total Earned"],["4.9","Rating"],["0","Disputes"]] : [["₦80k","Total Spent"],["4","Jobs Done"],["0","Disputes"]];
  return (
    <motion.div {...fadeUp}>
      <Card style={{ padding: 0, overflow: "hidden", maxWidth: 540 }}>
        <div style={{ height: 130, background: "linear-gradient(135deg,#141A26,#1C2438)", position: "relative", borderBottom: `1px solid ${T.bdr}` }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle,${T.gold}15 0%,transparent 70%)` }} />
          <div style={{ position: "absolute", bottom: -40, left: 24, width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg,${T.gold},${T.goldd})`, border: `4px solid ${T.surf}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="syne" style={{ color: "#0B0F17", fontSize: 24, fontWeight: 800 }}>{ia ? "KA" : "BA"}</span>
          </div>
        </div>
        <div style={{ padding: "52px 28px 28px" }}>
          <div className="syne" style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginBottom: 4, letterSpacing: "-0.02em" }}>{ia ? "Kehinde Adeyemi" : "Bola Adesanya"}</div>
          <div style={{ fontSize: 14, color: T.t3, marginBottom: 16 }}>{ia ? "Tailor · Surulere, Lagos · Joined Jan 2024" : "Client · Victoria Island, Lagos · Joined Mar 2024"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}><Badge variant="green">Verified</Badge><Badge variant="gold">Top Rated</Badge>{ia && <Badge variant="muted">14 Jobs Completed</Badge>}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
            {stats.map(([v, l]) => (
              <div key={l} style={{ textAlign: "center", padding: 14, background: T.surf2, borderRadius: 10, border: `1px solid ${T.bdr}` }}>
                <div className="mono syne" style={{ fontSize: 20, fontWeight: 700, color: T.gold }}>{v}</div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
          {ia && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Specialisations</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["Senator Kaftan","Agbada","Bridal Gown","Native Attire"].map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</div>
            </div>
          )}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Reviews</div>
            {[{ name:"Bola A.", text:"Excellent work, very professional. Kaftan was perfect.", rating:5 }, { name:"Ngozi O.", text:"Gate welding done on time. Would hire again.", rating:5 }].map((r, i) => (
              <div key={i} style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{r.name}</div><div style={{ color: T.gold, fontSize: 12, letterSpacing: 2 }}>{"★".repeat(r.rating)}</div></div>
                <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.5 }}>{r.text}</div>
              </div>
            ))}
          </div>
          <BtnPrimary>Edit Profile</BtnPrimary>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,  setScreen]  = useState<Screen>("auth");
  const [role,    setRole]    = useState<Role>("artisan");
  const [section, setSection] = useState<Section>("dashboard");
  const [toast,   setToast]   = useState("");

  const handlePay = async (amount: number) => {
  try {
    const res = await fetch("http://localhost:5000/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        email: "test@dealr.com",
        jobId: "JOB001"
      })
    });

    const data = await res.json();

    if (data.checkoutUrl || data.link) {
      window.location.href = data.checkoutUrl || data.link;
    }
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    const tag = document.createElement("style");
    tag.innerHTML = CSS;
    document.head.appendChild(tag);
    return () => { document.head.removeChild(tag); };
  }, []);

  const showToast: ToastFn = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }, []);

  if (screen === "auth")    return <><style>{CSS}</style><AuthPage    onLogin={(r) => { setRole(r); setScreen("onboard"); }} /></>;
  if (screen === "onboard") return <><OnboardingPage role={role} onComplete={() => { setScreen("app"); setSection("dashboard"); }} /><Toast msg={toast} /></>;

  const section$ = () => {
    switch (section) {
      case "dashboard": return <DashboardSection role={role} onNav={setSection} />;
      case "jobs":      return <JobsSection      role={role} showToast={showToast} />;
      case "pricing":   return <PricingSection   />;
      case "bidding":   return <BiddingSection   showToast={showToast} />;
      case "wallet":    return <WalletSection    showToast={showToast} />;
      case "messages":  return <MessagesSection  />;
      case "tracker":   return <TrackerSection   />;
      case "profile":   return <ProfileSection   role={role} />;
      default:          return <DashboardSection role={role} onNav={setSection} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <Sidebar role={role} active={section} onNav={setSection} onLogout={() => { setScreen("auth"); setSection("dashboard"); }} />
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px 64px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <AnimatePresence mode="wait">
            <motion.div key={section} {...fadeUp}>{section$()}</motion.div>
          </AnimatePresence>
        </div>
      </div>
      <Toast msg={toast} />
    </div>
  );
}