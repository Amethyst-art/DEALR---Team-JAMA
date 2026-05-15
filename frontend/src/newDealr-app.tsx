/**
 * Dealr.tsx — Full App 
 *
 * SETUP IN GITHUB CODESPACE:
 *   npm install framer-motion
 *   (Tailwind not required — all styles are inline/CSS vars)
 *
 * BACKEND INTEGRATION NOTES are at the bottom of this file as comments.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
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

  t1:  "#F0F2F8",
  t2:  "#8891A8",
  t3:  "#4A5268",

  // Subtle gradient accent
  accent: "linear-gradient(135deg, #D4A853 0%, #A07830 100%)",
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; }

body {
  font-family: 'DM Sans', sans-serif;
  background: #0B0F17;
  color: #F0F2F8;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Subtle noise texture */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
  opacity: 0.4;
}

/* Warm ambient glow */
body::after {
  content: '';
  position: fixed;
  bottom: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212,168,83,0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
@keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.mono { font-family: 'DM Mono', monospace; }
.syne { font-family: 'Syne', sans-serif; }
`;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Role = "artisan" | "client";
type Screen = "auth" | "onboard" | "app";
type Section =
  | "dashboard" | "jobs" | "pricing" | "bidding"
  | "wallet" | "messages" | "tracker" | "profile";

type ToastFn = (msg: string) => void;

interface JobItem {
  desc: string;
  meta: string;
  amt: string;
  st: "escrow" | "pending" | "done";
}

// ─── MOTION PRESETS ───────────────────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const itemFade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ children, variant = "gold" }: { children: ReactNode; variant?: "gold" | "green" | "red" | "amber" | "muted" }) {
  const v: Record<string, { bg: string; color: string }> = {
    gold:   { bg: T.goldl,  color: T.gold },
    green:  { bg: T.greenl, color: T.green },
    red:    { bg: T.redl,   color: T.red },
    amber:  { bg: T.amberl, color: T.amber },
    muted:  { bg: "rgba(255,255,255,0.05)", color: T.t2 },
  };
  const s = v[variant];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
      padding: "3px 9px", borderRadius: 6,
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}22`,
      display: "inline-flex", alignItems: "center",
    }}>{children}</span>
  );
}

function Avatar({ initials, size = 36, variant = "gold" }: { initials: string; size?: number; variant?: "gold" | "green" | "muted" }) {
  const bgs: Record<string, string> = {
    gold:  `linear-gradient(135deg, ${T.gold}, ${T.goldd})`,
    green: `linear-gradient(135deg, ${T.green}, #1A9068)`,
    muted: "rgba(255,255,255,0.06)",
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bgs[variant], flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: variant === "muted" ? T.t2 : "#0B0F17",
      fontSize: size * 0.34, fontWeight: 700,
      fontFamily: "'Syne', sans-serif",
    }}>{initials}</div>
  );
}

function Card({ children, style = {}, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.005 } : {}}
      style={{
        background: T.surf,
        border: `1px solid ${T.bdr}`,
        borderRadius: 16,
        padding: 24,
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >{children}</motion.div>
  );
}

function Divider({ style = {} }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: T.bdr, ...style }} />;
}

function BtnPrimary({
  children, onClick, disabled = false, style = {}, loading = false
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties; loading?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        width: "100%", padding: "13px 20px", borderRadius: 10,
        fontSize: 14, fontWeight: 600,
        background: disabled ? "rgba(255,255,255,0.06)" : T.accent,
        color: disabled ? T.t3 : "#0B0F17",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        letterSpacing: "0.01em",
        ...style,
      }}
    >
      {loading ? <Spinner size={14} color="#0B0F17" /> : children}
    </motion.button>
  );
}

function BtnSecondary({ children, onClick, style = {} }: { children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01, background: "rgba(255,255,255,0.08)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        padding: "11px 20px", borderRadius: 10,
        fontSize: 14, fontWeight: 500,
        background: "rgba(255,255,255,0.05)",
        color: T.t1, border: `1px solid ${T.bdr2}`,
        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        ...style,
      }}
    >{children}</motion.button>
  );
}

function BtnGhost({ children, onClick, style = {} }: { children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      style={{
        padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: "transparent", color: T.t2,
        border: "none", cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        display: "inline-flex", alignItems: "center", gap: 6,
        ...style,
      }}
    >{children}</motion.button>
  );
}

function InputField({
  label, type = "text", placeholder, value, onChange, style = {}
}: {
  label?: string; type?: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <motion.div
        animate={{ boxShadow: focused ? `0 0 0 2px ${T.gold}40` : "0 0 0 0px transparent" }}
        style={{ borderRadius: 10 }}
      >
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "12px 14px",
            border: `1px solid ${focused ? T.gold + "60" : T.bdr2}`,
            borderRadius: 10, fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            color: T.t1, background: T.surf2,
            outline: "none", transition: "border-color 0.2s",
            ...style,
          }}
        />
      </motion.div>
    </div>
  );
}

function Spinner({ size = 18, color = T.gold }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid ${color}30`,
      borderTopColor: color, borderRadius: "50%",
      animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function StatCard({ label, value, sub, accent = "gold" }: { label: string; value: string; sub?: string; accent?: "gold" | "green" | "red" }) {
  const colors: Record<string, string> = { gold: T.gold, green: T.green, red: T.red };
  const c = colors[accent];
  return (
    <motion.div variants={itemFade} style={{
      background: T.surf, border: `1px solid ${T.bdr}`,
      borderRadius: 14, padding: 20, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${c}, ${c}44)` }} />
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
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
            background: T.surf2, color: T.t1,
            padding: "11px 20px", borderRadius: 40,
            fontSize: 13, fontWeight: 500, zIndex: 9999,
            whiteSpace: "nowrap", pointerEvents: "none",
            border: `1px solid ${T.bdr2}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, flexShrink: 0, display: "inline-block" }} />
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
interface NavItem { id: Section; label: string; icon: string; }

const ARTISAN_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard",    icon: "◉" },
  { id: "jobs",      label: "Jobs",         icon: "⬡" },
  { id: "pricing",   label: "Price Advisor",icon: "◈" },
  { id: "bidding",   label: "Open Bids",    icon: "◎" },
  { id: "wallet",    label: "Wallet",       icon: "◇" },
  { id: "messages",  label: "Messages",     icon: "◫" },
  { id: "tracker",   label: "AI Tracker",   icon: "◆" },
  { id: "profile",   label: "Profile",      icon: "◯" },
];
const CLIENT_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard",  icon: "◉" },
  { id: "jobs",      label: "My Jobs",    icon: "⬡" },
  { id: "wallet",    label: "Wallet",     icon: "◇" },
  { id: "messages",  label: "Messages",   icon: "◫" },
  { id: "profile",   label: "Profile",    icon: "◯" },
];

function Sidebar({ role, active, onNav, onLogout }: { role: Role; active: Section; onNav: (s: Section) => void; onLogout: () => void; }) {
  const nav = role === "artisan" ? ARTISAN_NAV : CLIENT_NAV;
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" as const }}
      style={{
        width: 220, flexShrink: 0, height: "100vh", position: "sticky", top: 0,
        display: "flex", flexDirection: "column",
        background: T.surf, borderRight: `1px solid ${T.bdr}`,
        padding: "24px 16px",
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: T.t1, paddingLeft: 8, marginBottom: 32, letterSpacing: "-0.03em" }}>
        Deal<span style={{ color: T.gold }}>r</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map((item) => {
          const isActive = active === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onNav(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8,
                fontSize: 13.5, fontWeight: isActive ? 600 : 400,
                color: isActive ? T.gold : T.t2,
                background: isActive ? T.goldl : "transparent",
                border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                textAlign: "left", transition: "color 0.15s, background 0.15s",
              }}
            >
              <span style={{ fontSize: 14, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  style={{
                    position: "absolute", right: 16, width: 3, height: 18,
                    background: T.gold, borderRadius: 2,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Role badge + logout */}
      <div>
        <Divider style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 12 }}>
          <Avatar initials={role === "artisan" ? "KA" : "BA"} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{role === "artisan" ? "Kehinde A." : "Bola A."}</div>
            <Badge variant="muted">{role}</Badge>
          </div>
        </div>
        <BtnGhost onClick={onLogout} style={{ width: "100%", justifyContent: "flex-start", paddingLeft: 12 }}>
          Sign out
        </BtnGhost>
      </div>
    </motion.div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────

function AuthPage({ onLogin }: { onLogin: (r: Role, email: string) => void }) {
  const [role, setRole] = useState<Role>("artisan");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  // Rotating words hooks and variables
  const rotatingWords = ["artisan", "entrepreneur", "creative", "innovator"];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    "AI-verified market pricing",
    "Squad escrow — pay only after delivery",
    "Multi-currency withdrawal",
    "Live bidding on open jobs",
  ];

  return (
    // Base Parent Container configuration
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      
      {/* Animated Africa SVG Background Layer (Framer Motion Enhanced) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, rotate: -12 }}
        animate={{ opacity: 0.08, scale: 1, rotate: -8 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
        style={{ 
          position: "absolute", 
          bottom: "-140px", 
          left: "-120px", 
          width: "420px", 
          height: "420px", 
          backgroundImage: "url('/workspaces/DEALR---Team-JAMA/frontend/public/Outlined%20Image%20with%20Negative%20Space.svg')", 
          backgroundRepeat: "no-repeat", 
          backgroundSize: "contain", 
          zIndex: 0, 
          pointerEvents: "none",
          transformOrigin: "bottom left" // Anchors rotation cleanly to the corner pivot
        }} 
      />

      {/* Left panel wrapper - zIndex: 2 */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" as const }}
        style={{
          flex: 1,
          background: `linear-gradient(160deg, #141A26 0%, #0B0F17 100%)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        {/* Ambient circle */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${T.gold}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        
        {/* Logo Layer */}
        <div
          className="syne"
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: T.t1,
            letterSpacing: "-0.04em",
            marginBottom: 16,
            lineHeight: 1.1,
          }}
        >
          Deal<span style={{ color: T.gold }}>r.</span>
        </div>

        {/* Subheadline with rotating text injection */}
        <div
          style={{
            fontSize: 16,
            color: T.t2,
            lineHeight: 1.75,
            maxWidth: 320,
            marginBottom: 48,
          }}
        >
          Deals done right, Every time.
          <br />
          For every <span style={{ color: T.gold, textTransform: "lowercase" }}>{rotatingWords[wordIndex]}</span> in Nigeria.
        </div>

        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {features.map((f) => (
            <motion.div
              key={f}
              variants={itemFade}
              style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: T.goldl,
                  border: `1px solid ${T.gold}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <span style={{ color: T.gold, fontSize: 10, fontWeight: 700 }}>
                  ✓
                </span>
              </div>
              <span style={{ fontSize: 14, color: T.t2, lineHeight: 1.5 }}>
                {f}
              </span>
            </motion.div>
          ))}
        </motion.div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 72,
            fontSize: 11,
            color: T.t3,
            letterSpacing: "0.04em",
          }}
        >
          Powered by Squad API
        </div>
      </motion.div>

      {/* Right panel / Login Card wrapper - zIndex: 2 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          width: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          background: T.surf,
          borderLeft: `1px solid ${T.bdr}`,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ width: "100%", maxWidth: 340 }}>
          <div
            className="syne"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: T.t1,
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </div>
          <div style={{ fontSize: 14, color: T.t2, marginBottom: 32 }}>
            Dealr.
          </div>
          {/* Role toggle */}
          <div
            style={{
              display: "flex",
              borderRadius: 10,
              padding: 4,
              marginBottom: 28,
              gap: 4,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${T.bdr}`,
            }}
          >
            {(["artisan", "client"] as Role[]).map((r) => (
              <motion.button
                key={r}
                onClick={() => setRole(r)}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  background: role === r ? T.goldl : "transparent",
                  color: role === r ? T.gold : T.t3,
                  border:
                    role === r ? `1px solid ${T.gold}30` : "1px solid transparent",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {r}
              </motion.button>
            ))}
          </div>
          <InputField
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <BtnPrimary
            onClick={() => onLogin(role, email)}
            style={{ marginBottom: 16, marginTop: 4 }}
          >
            Continue{" "}
          </BtnPrimary>
          <div style={{ textAlign: "center", fontSize: 13, color: T.t3 }}>
            No account?{" "}
            <span
              onClick={() => onLogin(role, email)}
              style={{ color: T.gold, fontWeight: 600, cursor: "pointer" }}
            >
              Sign up free
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingPage({ role, onComplete }: { role: Role; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", location: "", skills: "", experience: "", purpose: "" });
  const upd = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const steps = role === "artisan" ? ["Basic Info", "Your Skills", "Done"] : ["Basic Info", "Your Needs", "Done"];

  const artisanSteps = [
    <>
      <InputField label="Full Name" placeholder="Kehinde Adeyemi" value={form.name} onChange={(e) => upd("name", e.target.value)} />
      <InputField label="Location" placeholder="e.g. Surulere, Lagos" value={form.location} onChange={(e) => upd("location", e.target.value)} />
    </>,
    <>
      <InputField label="Your Trade / Skills" placeholder="e.g. Tailor, Makeup Artist, Welder" value={form.skills} onChange={(e) => upd("skills", e.target.value)} />
      <InputField label="Years of Experience" placeholder="e.g. 5" value={form.experience} onChange={(e) => upd("experience", e.target.value)} />
    </>,
    <motion.div key="done" {...fadeUp} style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
      <div className="syne" style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginBottom: 8 }}>You're all set, {form.name || "Artisan"}!</div>
      <div style={{ fontSize: 14, color: T.t2 }}>Your Dealr profile is ready.</div>
    </motion.div>,
  ];

  const clientSteps = [
    <>
      <InputField label="Full Name" placeholder="Bola Adesanya" value={form.name} onChange={(e) => upd("name", e.target.value)} />
      <InputField label="Location" placeholder="e.g. Victoria Island, Lagos" value={form.location} onChange={(e) => upd("location", e.target.value)} />
    </>,
    <>
      <InputField label="What do you mainly hire for?" placeholder="e.g. tailoring, welding, events..." value={form.purpose} onChange={(e) => upd("purpose", e.target.value)} />
    </>,
    <motion.div key="done" {...fadeUp} style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
      <div className="syne" style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginBottom: 8 }}>Welcome, {form.name || "Client"}!</div>
      <div style={{ fontSize: 14, color: T.t2 }}>Post a job, set a budget, and pay only after delivery.</div>
    </motion.div>,
  ];

  const stepContent = role === "artisan" ? artisanSteps : clientSteps;
  const isLast = step === steps.length - 1;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div className="syne" style={{ textAlign: "center", fontSize: 26, fontWeight: 800, color: T.t1, marginBottom: 8, letterSpacing: "-0.03em" }}>
          Deal<span style={{ color: T.gold }}>r</span>
        </div>
        <div style={{ fontSize: 14, color: T.t2, textAlign: "center", marginBottom: 36 }}>Let's set up your profile</div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <motion.div
                animate={{ background: i <= step ? T.gold : "rgba(255,255,255,0.08)" }}
                style={{ height: 3, borderRadius: 2, marginBottom: 6 }}
              />
              <div style={{ fontSize: 11, color: i <= step ? T.gold : T.t3, fontWeight: i === step ? 600 : 400 }}>{s}</div>
            </div>
          ))}
        </div>

        <Card style={{ padding: 32 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} {...fadeUp}>
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 0 && !isLast && (
              <BtnSecondary onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>Back</BtnSecondary>
            )}
            <BtnPrimary
              onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
              style={{ flex: 1 }}
            >
              {isLast ? "Get Started" : "Continue"}
            </BtnPrimary>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function DashboardSection({ role, onNav }: { role: Role; onNav: (s: Section) => void }) {
  const isArtisan = role === "artisan";
  
  
  const [userName, setUserName] = useState(isArtisan ? "Kehinde" : "Bola");

  
  useEffect(() => {
    setUserName(isArtisan ? "Kehinde" : "Bola");
  }, [role, isArtisan]);

  const recentJobs: JobItem[] = [
    { desc: "Senator kaftan with hand embroidery", meta: isArtisan ? "Bola A. · Due tomorrow" : "Kehinde Adeyemi · Due tomorrow", amt: "₦21,000", st: "escrow" },
    { desc: "Birthday decoration — 200 guests", meta: isArtisan ? "Tunde M. · Due Friday" : "Zainab Events · Due Friday", amt: "₦55,000", st: "pending" },
    { desc: "Compound gate welding — 3.5m", meta: isArtisan ? "Ngozi O. · Completed" : "Seun Builders · Completed", amt: "₦38,000", st: "done" },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      {/* Header */}
      <motion.div variants={itemFade} style={{ marginBottom: 32 }}>
        <div className="syne" style={{ fontSize: 28, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>
          {`Good morning, ${userName} 👋`}
        </div>
        <div style={{ fontSize: 14, color: T.t2 }}>
          {isArtisan ? "You have 2 active jobs and 1 new bid opportunity." : "You have 2 active jobs in escrow."}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemFade} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {isArtisan ? (
          <>
            <StatCard label="Available" value="₦84,500" sub="↑ ₦21k this week" accent="gold" />
            <StatCard label="In Escrow" value="₦38,000" sub="2 active jobs" accent="green" />
            <StatCard label="Win Rate" value="67%" sub="↑ 12% this month" accent="green" />
          </>
        ) : (
          <>
            <StatCard label="Total Spent" value="₦80,000" sub="4 jobs done" accent="gold" />
            <StatCard label="In Escrow" value="₦38,000" sub="2 active jobs" accent="green" />
            <StatCard label="Disputes" value="0" sub="Clean record" accent="green" />
          </>
        )}
      </motion.div>

      {/* CTA row */}
      <motion.div variants={itemFade} style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {isArtisan ? (
          <>
            <BtnPrimary onClick={() => onNav("jobs")} style={{ width: "auto", padding: "11px 24px" }}>+ Create Job</BtnPrimary>
            <BtnSecondary onClick={() => onNav("pricing")}>Price Advisor</BtnSecondary>
            <BtnSecondary onClick={() => onNav("bidding")}>Open Bids</BtnSecondary>
          </>
        ) : (
          <>
            <BtnPrimary onClick={() => onNav("jobs")} style={{ width: "auto", padding: "11px 24px" }}>View Jobs</BtnPrimary>
            <BtnSecondary onClick={() => onNav("messages")}>Messages</BtnSecondary>
          </>
        )}
      </motion.div>

      {/* Recent jobs */}
      <motion.div variants={itemFade}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Recent Jobs</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentJobs.map((j, i) => <JobRow key={i} {...j} />)}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── JOB ROW ─────────────────────────────────────────────────────────────────
function JobRow({ desc, meta, amt, st, onClick }: JobItem & { onClick?: () => void }) {
  const statusMap: Record<string, { label: string; variant: "gold" | "green" | "amber" }> = {
    escrow:  { label: "In Escrow", variant: "gold" },
    pending: { label: "Pending",   variant: "amber" },
    done:    { label: "Paid",      variant: "green" },
  };
  const s = statusMap[st] || statusMap.done;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 2, borderColor: "rgba(255,255,255,0.14)" }}
      style={{
        background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 12,
        padding: "16px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.t1, marginBottom: 3 }}>{desc}</div>
        <div style={{ fontSize: 12, color: T.t3 }}>{meta}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{amt}</div>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
    </motion.div>
  );
}

// ─── AI PRICING DATA (mock — replace with Claude API calls) ─────────────────
type JobType = "makeup" | "kaftan" | "gate" | "decoration";

interface PriceResponse {
  valid: boolean;
  verdict: string;
  breakdown: Record<string, string>;
  total: string;
  range: string;
  note: string;
}

const PRICE_RESPONSES: Record<JobType, PriceResponse> = {
  makeup: {
    valid: true, verdict: "Fair",
    breakdown: { "Professional time (4hrs)": "₦40,000", "Skill premium (bridal)": "₦35,000", "Early morning surcharge": "₦15,000", "Products & kit use": "₦18,000" },
    total: "₦108,000", range: "₦95,000 – ₦130,000",
    note: "Your price is within the Lagos market range for bridal MUAs. The 8am start and 2-day notice justify the premium. Hold this price confidently.",
  },
  kaftan: {
    valid: true, verdict: "Fair",
    breakdown: { "Fabric": "₦8,000", "Labour (tailoring)": "₦12,000", "Embroidery work": "₦9,000", "Overhead": "₦3,000", "Complexity": "₦3,000" },
    total: "₦35,000", range: "₦28,000 – ₦45,000",
    note: "Senator kaftans with hand embroidery typically run ₦28k–₦45k in Lagos. You're priced correctly.",
  },
  gate: {
    valid: false, verdict: "Too Low",
    breakdown: { "Welding materials": "₦22,000", "Labour (2 welders, 2 days)": "₦28,000", "Transportation": "₦5,000", "Equipment use": "₦6,000", "Finishing & paint": "₦8,000" },
    total: "₦69,000", range: "₦65,000 – ₦90,000",
    note: "Your price is at the very bottom of the market range and may not cover materials and labour. We recommend pricing at ₦72,000 minimum.",
  },
  decoration: {
    valid: true, verdict: "Fair",
    breakdown: { "Balloon arch": "₦18,000", "Centrepieces (20 tables)": "₦24,000", "Labour (4hrs setup)": "₦20,000", "Transport": "₦8,000", "Contingency": "₦10,000" },
    total: "₦80,000", range: "₦70,000 – ₦110,000",
    note: "Fair for 200-guest event decoration in Lagos. You have room to go up to ₦90,000 if the venue is far or setup is complex.",
  },
};

function detectJob(text: string): JobType | null {
  const t = text.toLowerCase();
  if (t.includes("makeup") || t.includes("mua") || t.includes("bridal")) return "makeup";
  if (t.includes("kaftan") || t.includes("agbada") || t.includes("tailor")) return "kaftan";
  if (t.includes("gate") || t.includes("weld") || t.includes("fence")) return "gate";
  if (t.includes("decoration") || t.includes("event") || t.includes("balloon")) return "decoration";
  return null;
}

// ─── PRICING SECTION ──────────────────────────────────────────────────────────
interface ChatMsg {
  type: "user" | "bot";
  text: string;
  breakdown?: Record<string, string>;
  range?: string;
  valid?: boolean;
  verdict?: string;
}

const QUICK_PROMPTS = [
  { label: "Bridal makeup ₦120k", text: "I want to charge ₦120,000 for bridal makeup for one person at 8am in 2 days. Is that valid?" },
  { label: "Kaftan ₦35k",          text: "I want to price a senator kaftan with embroidery at ₦35,000. Is that fair?" },
  { label: "Gate welding ₦65k",   text: "Gate welding 3.5m wide, I want to charge ₦65,000. Too much?" },
  { label: "Decoration ₦80k",     text: "Event decoration for 150 guests, ₦80,000. Good price?" },
];

function PricingSection() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { type: "bot", text: "Tell me about the job you want to price. For example: \"I want to charge ₦120,000 for bridal makeup at 8am in 2 days. Is that fair?\"" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, typing]);

  const send = (text?: string) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    setMsgs((p) => [...p, { type: "user", text: t }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const job = detectJob(t);
      if (job) {
        const r = PRICE_RESPONSES[job];
        setMsgs((p) => [...p, { type: "bot", text: r.note, breakdown: r.breakdown, range: r.range, valid: r.valid, verdict: r.verdict }]);
      } else {
        setMsgs((p) => [...p, { type: "bot", text: "Tell me the job type and your proposed price, and I'll verify if it's fair for the Nigerian market. Example: \"I want to charge ₦50,000 for X — is that right?\"" }]);
      }
    }, 1500);
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
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.goldl, border: `1px solid ${T.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16 }}>◈</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>Dealr Price Advisor</div>
            <div style={{ fontSize: 12, color: T.green, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 2s infinite" }} />
              Claude AI · Online
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={msgsRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{ maxWidth: "80%", alignSelf: m.type === "user" ? "flex-end" : "flex-start", display: "flex", flexDirection: "column", gap: 6, alignItems: m.type === "user" ? "flex-end" : "flex-start" }}
              >
                <div style={{
                  padding: "11px 14px", fontSize: 13.5, lineHeight: 1.6,
                  borderRadius: m.type === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.type === "user" ? `linear-gradient(135deg, ${T.gold}, ${T.goldd})` : T.surf2,
                  color: m.type === "user" ? "#0B0F17" : T.t1,
                  border: m.type === "bot" ? `1px solid ${T.bdr}` : "none",
                }}>{m.text}</div>
                {m.breakdown && (
                  <div style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 14, width: "100%", maxWidth: 300 }}>
                    {Object.entries(m.breakdown).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: T.t2, borderBottom: `1px solid ${T.bdr}` }}>
                        <span>{k}</span>
                        <span className="mono" style={{ color: T.t1 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: 600, fontSize: 12, color: T.t1 }}>
                      <span>Market range</span>
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

          {typing && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 5, padding: "12px 14px", background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: T.t3, animation: "pulse 1s infinite", animationDelay: `${i * 0.15}s` }} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Quick chips */}
        <div style={{ padding: "0 16px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_PROMPTS.map((q) => (
            <motion.button key={q.label} whileTap={{ scale: 0.96 }} onClick={() => send(q.text)} style={{
              fontSize: 11, padding: "5px 12px", background: T.goldl, color: T.gold,
              borderRadius: 20, border: `1px solid ${T.gold}30`, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            }}>{q.label}</motion.button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Describe your job and proposed price..."
            style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.bdr2}`, borderRadius: 30, fontSize: 13.5, fontFamily: "inherit", color: T.t1, background: T.surf2, outline: "none" }}
          />
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => send()} style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldd})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0F17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── JOBS SECTION ─────────────────────────────────────────────────────────────
function JobsSection({ role, showToast }: { role: Role; showToast: ToastFn }) {
  const [filter, setFilter] = useState("all");
  const [jobDesc, setJobDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const isArtisan = role === "artisan";

  const jobs: JobItem[] = [
    { desc: "Senator kaftan with hand embroidery",  meta: isArtisan ? "Bola A. · Due tomorrow" : "Kehinde Adeyemi · Due tomorrow", amt: "₦21,000", st: "escrow" },
    { desc: "Birthday decoration — 200 guests",     meta: isArtisan ? "Tunde M. · Due Friday" : "Zainab Events · Due Friday",      amt: "₦55,000", st: "pending" },
    { desc: "Compound gate welding — 3.5m",         meta: isArtisan ? "Ngozi O. · Completed"  : "Seun Builders · Completed",       amt: "₦38,000", st: "done" },
    { desc: "Traditional wedding hair & makeup",    meta: isArtisan ? "Amaka I. · Completed"  : "Amaka I. · Completed",            amt: "₦42,000", st: "done" },
  ];

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.st === filter);
  const genPrice = () => { if (!jobDesc.trim()) return; setGenerating(true); setTimeout(() => { setGenerating(false); setShowOutput(true); }, 2200); };

  if (showOutput) return (
    <motion.div {...fadeUp}>
      <BtnGhost onClick={() => setShowOutput(false)} style={{ marginBottom: 20 }}>← Edit Job</BtnGhost>
      <Card style={{ maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Market range: ₦18,000 – ₦24,000</div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="syne mono"
            style={{ fontSize: 52, fontWeight: 800, color: T.gold, lineHeight: 1, marginBottom: 6 }}
          >₦21,000</motion.div>
          <div style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>AI Recommended Price</div>
        </div>

        <Divider style={{ marginBottom: 20 }} />

        <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Cost Breakdown</div>
        {[["Materials & fabric", "₦5,000"], ["Labour & skill", "₦7,200"], ["Overhead & urgency", "₦1,220"], ["Complexity", "₦2,580"]].map(([k, v], i) => (
          <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
            style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.bdr}`, fontSize: 14 }}>
            <span style={{ color: T.t2 }}>{k}</span>
            <span className="mono" style={{ fontWeight: 600, color: T.t1 }}>{v}</span>
          </motion.div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 700, fontSize: 14 }}>
          <span style={{ color: T.t1 }}>Total</span>
          <span className="mono" style={{ color: T.gold, fontSize: 16 }}>₦21,000</span>
        </div>

        <Divider style={{ margin: "8px 0 20px" }} />

        <div style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 13, color: T.t2, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: T.t3, marginBottom: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Auto-Generated Agreement</div>
          — Artisan agrees to complete the described job.<br />
          — Delivery within 4 days of payment confirmation.<br />
          — ₦21,000 held in Squad escrow until delivery confirmed.<br />
          — Either party may raise a dispute within 48 hours of delivery.
        </div>

        <BtnPrimary onClick={() => { setShowOutput(false); showToast("Job sent to client successfully"); }}>
          Confirm & Send to Client →
        </BtnPrimary>
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: T.t3 }}>Client receives a secure Squad payment link</div>
      </Card>
    </motion.div>
  );

  return (
  <motion.div variants={stagger} initial="initial" animate="animate">
    {/* Header */}
    <motion.div variants={itemFade} style={{ marginBottom: 24 }}>
      <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>
        My Jobs
      </div>
      <div style={{ fontSize: 14, color: T.t2 }}>
        {isArtisan ? "Manage active and past jobs." : "Track jobs, confirm delivery, release payments."}
      </div>
    </motion.div>

    {/* Create Job Card - Swapped from 'isArtisan' to '!isArtisan' */}
    {!isArtisan && (
      <motion.div variants={itemFade}>
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 14 }}>
            Create New Job
          </div>
          <textarea 
            value={jobDesc} 
            onChange={(e) => setJobDesc(e.target.value)} 
            placeholder="Describe the job..." 
            style={{ 
              width: "100%", 
              minHeight: 100, 
              padding: 14, 
              border: `1px solid ${T.bdr2}`, 
              borderRadius: 8, 
              fontSize: 14, 
              fontFamily: "inherit", 
              color: T.t1, 
              background: T.surf2, 
              resize: "vertical", 
              outline: "none", 
              lineHeight: 1.6, 
              marginBottom: 12, 
            }} 
          />
          {generating && (
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
              <motion.div 
                animate={{ x: ["-100%", "200%"] }} 
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} 
                style={{ height: "100%", width: "50%", background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)`, borderRadius: 2 }} 
              />
            </div>
          )} 
          <BtnPrimary onClick={genPrice} disabled={generating}>
            {generating ? "Generating..." : "Generate Price with AI"}
          </BtnPrimary>
        </Card>
      </motion.div>
    )}

    {/* Filter tabs */}
    <motion.div variants={itemFade} style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
      {[["all", "All"], ["escrow", "In Escrow"], ["pending", "Pending"], ["done", "Completed"]].map(([v, l]) => (
        <motion.button 
          key={v} 
          onClick={() => setFilter(v)} 
          whileTap={{ scale: 0.97 }} 
          style={{ 
            padding: "7px 16px", 
            borderRadius: 8, 
            fontSize: 13, 
            border: `1px solid ${filter === v ? T.gold + "60" : T.bdr}`, 
            background: filter === v ? T.goldl : "transparent", 
            color: filter === v ? T.gold : T.t2, 
            cursor: "pointer", 
            fontFamily: "inherit", 
            transition: "all 0.15s", 
          }}
        >
          {l}
        </motion.button>
      ))}
    </motion.div>

    {/* Jobs List Section */}
    <motion.div variants={stagger} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <AnimatePresence mode="popLayout">
        {filtered.map((j, i) => {
          if (!isArtisan && j.st !== "done") {
            return (
              <motion.div 
                key={i} 
                variants={itemFade} 
                layout 
                style={{ 
                  background: T.surf, 
                  border: `1px solid ${T.bdr}`, 
                  borderRadius: 12, 
                  padding: "16px 20px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between" 
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.t1, marginBottom: 3 }}>{j.desc}</div>
                  <div style={{ fontSize: 12, color: T.t3 }}>{j.meta}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{j.amt}</span>
                  <motion.button 
                    whileTap={{ scale: 0.96 }} 
                    onClick={() => showToast(`Delivery confirmed. ${j.amt} released to artisan.`)} 
                    style={{ 
                      padding: "7px 14px", 
                      borderRadius: 8, 
                      background: T.greenl, 
                      color: T.green, 
                      border: `1px solid ${T.green}30`, 
                      fontSize: 12, 
                      fontWeight: 600, 
                      cursor: "pointer", 
                      fontFamily: "inherit" 
                    }}
                  >
                    ✓ Confirm Delivery
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.96 }} 
                    style={{ 
                      padding: "7px 14px", 
                      borderRadius: 8, 
                      background: "transparent", 
                      color: T.red, 
                      border: `1px solid ${T.red}30`, 
                      fontSize: 12, 
                      fontWeight: 600, 
                      cursor: "pointer", 
                      fontFamily: "inherit" 
                    }}
                  >
                    Dispute
                  </motion.button>
                </div>
              </motion.div>
            );
          }
          return (
            <motion.div key={i} variants={itemFade} layout>
              <JobRow {...j} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  </motion.div>
);
}

// ─── BIDDING ─────────────────────────────────────────────────────────────────
interface BidListing {
  title: string; client: string; budget: string;
  count: number; lowest: string; desc: string; live: boolean;
}

function BiddingSection({ showToast }: { showToast: ToastFn }) {
  const [bids, setBids] = useState<Record<string, string>>({ b0: "", b1: "", b2: "" });

  const BIDS: BidListing[] = [
    { title: "Bridal makeup — 2 people, Saturday 7am", client: "Chioma A. · Lagos Island", budget: "₦80,000 – ₦120,000", count: 7, lowest: "₦92,000", desc: "Professional MUA for two bridesmaids. Traditional Yoruba wedding. Makeup must last 8+ hours.", live: true },
    { title: "Agbada stitching — 3 sets, plain fabric", client: "Emeka N. · Abuja", budget: "₦30,000 – ₦55,000", count: 3, lowest: "₦41,000", desc: "3 plain agbada stitched — fabric provided. Delivery needed in Abuja within 5 days.", live: true },
    { title: "Compound painting — 4-bedroom bungalow", client: "Funmi L. · Ibadan", budget: "₦120,000 – ₦200,000", count: 12, lowest: "₦148,000", desc: "External and internal painting. Client supplies paint. 7-day job.", live: false },
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
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: T.t3 }}>{b.client}</div>
              </div>
              <Badge variant={b.live ? "red" : "amber"}>
                <span style={{ animation: b.live ? "pulse 1.5s infinite" : "none", display: "inline-block" }}>●</span>
                {" "}{b.live ? "Live" : "Closing"}
              </Badge>
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
              <input
                value={bids[`b${i}`]} onChange={(e) => setBids((p) => ({ ...p, [`b${i}`]: e.target.value }))}
                type="number" placeholder="Your bid in ₦"
                style={{ flex: 1, padding: "10px 13px", border: `1px solid ${T.bdr2}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: T.t1, background: T.surf2, outline: "none" }}
              />
              <BtnPrimary
                onClick={() => { if (bids[`b${i}`]) { showToast(`Bid of ₦${Number(bids[`b${i}`]).toLocaleString()} placed`); setBids((p) => ({ ...p, [`b${i}`]: "" })); } }}
                style={{ width: "auto", padding: "10px 20px" }}
              >Place Bid</BtnPrimary>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── WALLET ───────────────────────────────────────────────────────────────────
interface Currency { code: string; sym: string; flag: string; rate: number; }

function WalletSection({ showToast }: { showToast: ToastFn }) {
  const [curr, setCurr] = useState("NGN");
  const [amt, setAmt] = useState("0");
  const [selectedBank, setSelectedBank] = useState(0);

  const CURRENCIES: Currency[] = [
    { code: "NGN",  sym: "₦",   flag: "🇳🇬", rate: 1 },
    { code: "USD",  sym: "$",   flag: "🇺🇸", rate: 0.00065 },
    { code: "GBP",  sym: "£",   flag: "🇬🇧", rate: 0.00051 },
    { code: "EUR",  sym: "€",   flag: "🇪🇺", rate: 0.00060 },
    { code: "CAD",  sym: "C$",  flag: "🇨🇦", rate: 0.00089 },
    { code: "USDT", sym: "₮",   flag: "₮",   rate: 0.00065 },
  ];
  const cur = CURRENCIES.find((c) => c.code === curr) || CURRENCIES[0];
  const BANKS = [{ name: "Guaranty Trust Bank", num: "**** 4521", init: "GT" }, { name: "OPay", num: "**** 8830", init: "OP" }];
  const TXNS = [
    { desc: "Senator kaftan — Bola A.", amt: "+₦21,000", date: "Today, 2:14pm", type: "in" },
    { desc: "Withdrawal to GTBank",     amt: "-₦15,000", date: "Yesterday, 10:30am", type: "out" },
    { desc: "Compound gate — Ngozi O.", amt: "+₦38,000", date: "2 days ago", type: "in" },
    { desc: "Withdrawal to GTBank",     amt: "-₦30,000", date: "3 days ago", type: "out" },
    { desc: "Wedding makeup — Amaka I.", amt: "+₦42,000", date: "5 days ago", type: "in" },
  ];

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
        <div style={{ background: `linear-gradient(135deg, #1A2030, #141B28)`, border: `1px solid ${T.gold}22`, borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${T.gold}20 0%, transparent 70%)` }} />
          <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Available Balance</div>
          <div className="mono syne" style={{ fontSize: 32, fontWeight: 700, color: T.gold, marginBottom: 4 }}>₦84,500</div>
          <div style={{ fontSize: 12, color: T.green }}>↑ +₦21,000 this week</div>
        </div>
        <div style={{ background: `linear-gradient(135deg, #1A2030, #141B28)`, border: `1px solid ${T.green}22`, borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${T.green}18 0%, transparent 70%)` }} />
          <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>In Escrow</div>
          <div className="mono syne" style={{ fontSize: 32, fontWeight: 700, color: T.green, marginBottom: 4 }}>₦38,000</div>
          <div style={{ fontSize: 12, color: T.t3 }}>2 active jobs</div>
        </div>
      </motion.div>

      {/* Withdraw card */}
      <motion.div variants={itemFade}>
        <Card style={{ marginBottom: 24, maxWidth: 500 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 20 }}>Withdraw Funds</div>

          {/* Currency grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: 20 }}>
            {CURRENCIES.map((c) => (
              <motion.button key={c.code} onClick={() => setCurr(c.code)} whileTap={{ scale: 0.94 }}
                style={{
                  padding: "8px 4px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                  border: `1px solid ${curr === c.code ? T.gold + "60" : T.bdr}`,
                  background: curr === c.code ? T.goldl : "rgba(255,255,255,0.03)",
                  color: curr === c.code ? T.gold : T.t3,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 16 }}>{c.flag}</span>
                {c.code}
              </motion.button>
            ))}
          </div>

          {/* Amount display */}
          <motion.div
            key={amt}
            initial={{ opacity: 0.7, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "16px 0 20px" }}
          >
            <div className="mono syne" style={{ fontSize: 44, fontWeight: 700, color: T.t1, letterSpacing: "-0.03em" }}>
              <span style={{ fontSize: 20, color: T.t3, fontWeight: 400 }}>{cur.sym}</span>
              {Number(amt).toLocaleString()}
            </div>
          </motion.div>

          {/* Numpad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
            {["1","2","3","4","5","6","7","8","9","000","0","del"].map((v) => (
              <motion.button key={v} whileTap={{ scale: 0.92 }} onClick={() => numPress(v)}
                style={{
                  padding: 14, border: `1px solid ${T.bdr}`, borderRadius: 10,
                  background: T.surf2, fontSize: v === "del" ? 16 : 18,
                  fontWeight: 500, color: T.t1, cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.1s",
                }}>{v === "del" ? "⌫" : v}</motion.button>
            ))}
          </div>

          {/* Banks */}
          <div style={{ marginBottom: 20 }}>
            {BANKS.map((b, i) => (
              <motion.div key={i} onClick={() => setSelectedBank(i)} whileTap={{ scale: 0.99 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 14,
                  border: `1px solid ${selectedBank === i ? T.gold + "60" : T.bdr}`,
                  borderRadius: 10, cursor: "pointer", marginBottom: 8,
                  background: selectedBank === i ? T.goldl : "rgba(255,255,255,0.02)", transition: "all 0.15s",
                }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: T.goldl, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.gold }}>{b.init}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>{b.name}</div>
                  <div className="mono" style={{ fontSize: 12, color: T.t3 }}>{b.num}</div>
                </div>
                {selectedBank === i && <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#0B0F17", fontSize: 10, fontWeight: 700 }}>✓</div>}
              </motion.div>
            ))}
          </div>

          <BtnPrimary onClick={() => {
            if (Number(amt) >= 100) { showToast(`${cur.sym}${Number(amt).toLocaleString()} withdrawal initiated`); setAmt("0"); }
            else showToast("Enter a valid amount");
          }}>
            Withdraw Now
          </BtnPrimary>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: T.t3 }}>Instant – 24h depending on bank · Powered by Squad</div>
        </Card>
      </motion.div>

      {/* Transactions */}
      <motion.div variants={itemFade}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 16 }}>Transaction History</div>
          {TXNS.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: i < TXNS.length - 1 ? `1px solid ${T.bdr}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.type === "in" ? T.greenl : T.redl, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  {t.type === "in" ? "↓" : "↑"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>{t.desc}</div>
                  <div style={{ fontSize: 12, color: T.t3 }}>{t.date}</div>
                </div>
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: t.type === "in" ? T.green : T.red }}>{t.amt}</div>
            </div>
          ))}
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
interface ThreadMsg { out: boolean; text: string; }
interface Convo { name: string; init: string; preview: string; time: string; unread: number; }

function MessagesSection() {
  const [active, setActive] = useState(0);
  const [msgInput, setMsgInput] = useState("");
  const [threadMsgs, setThreadMsgs] = useState<ThreadMsg[]>([
    { out: false, text: "Hey Kehinde, just checking in — is the kaftan almost done?" },
    { out: true,  text: "Yes! Just finishing the embroidery now. Should be ready by tomorrow morning." },
    { out: false, text: "Perfect. I'll confirm delivery then. The escrow payment is already in." },
  ]);
  const msgsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [threadMsgs]);

  const CONVS: Convo[] = [
    { name: "Bola Adesanya", init: "BA", preview: "Hey, is the kaftan almost done?", time: "2m", unread: 2 },
    { name: "Tunde Mahmoud", init: "TM", preview: "What time can you deliver?", time: "1h", unread: 0 },
    { name: "Ngozi Okonkwo", init: "NO", preview: "Payment confirmed, thank you!", time: "2d", unread: 0 },
  ];

  const sendMsg = () => {
    if (!msgInput.trim()) return;
    setThreadMsgs((p) => [...p, { out: true, text: msgInput.trim() }]);
    setMsgInput("");
  };

  return (
    <motion.div {...fadeUp} style={{ height: "calc(100vh - 96px)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", border: `1px solid ${T.bdr}`, borderRadius: 16, overflow: "hidden", background: T.surf }}>
        {/* Convo list */}
        <div style={{ borderRight: `1px solid ${T.bdr}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.bdr}` }}>
            <div className="syne" style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 10 }}>Messages</div>
            <input placeholder="Search..." style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.bdr}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: T.surf2, color: T.t1, outline: "none" }} />
          </div>
          {CONVS.map((c, i) => (
            <motion.div key={i} onClick={() => setActive(i)} whileHover={{ background: "rgba(255,255,255,0.03)" }}
              style={{ display: "flex", gap: 10, padding: 14, cursor: "pointer", borderBottom: `1px solid ${T.bdr}`, background: active === i ? T.goldl : "transparent", transition: "background 0.15s", alignItems: "flex-start" }}>
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
              <div style={{ fontSize: 12, color: T.green, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} /> Online
              </div>
            </div>
            <BtnSecondary style={{ padding: "7px 14px", fontSize: 12 }}>View Job</BtnSecondary>
          </div>

          <div ref={msgsRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <AnimatePresence initial={false}>
              {threadMsgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: m.out ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                  <div style={{
                    padding: "10px 14px", fontSize: 14, lineHeight: 1.55,
                    borderRadius: m.out ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.out ? `linear-gradient(135deg, ${T.gold}, ${T.goldd})` : T.surf2,
                    color: m.out ? "#0B0F17" : T.t1,
                    border: m.out ? "none" : `1px solid ${T.bdr}`,
                  }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: T.t3, marginTop: 4, textAlign: m.out ? "right" : "left" }}>Just now</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              placeholder="Type a message..." style={{ flex: 1, padding: "10px 16px", border: `1px solid ${T.bdr2}`, borderRadius: 30, fontSize: 14, fontFamily: "inherit", color: T.t1, background: T.surf2, outline: "none" }} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={sendMsg} style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldd})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0F17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── TRACKER ─────────────────────────────────────────────────────────────────
function TrackerSection() {
  const APPS = [
    { job: "Senator kaftan + embroidery", client: "Bola A.",  amt: "₦21,000", status: "Won",       variant: "green" as const },
    { job: "Event decoration — 200 guests", client: "Tunde M.", amt: "₦55,000", status: "In Review", variant: "amber" as const },
    { job: "Compound gate welding",        client: "Emeka N.", amt: "₦38,000", status: "Outbid",    variant: "red" as const },
    { job: "Bridal makeup — 3 people",     client: "Chioma A.", amt: "₦90,000", status: "Applied",   variant: "gold" as const },
  ];
  const SKILLS = [{ skill: "Digital invoicing", pct: 30 }, { skill: "Client communication", pct: 60 }, { skill: "Project photos/portfolio", pct: 45 }];
  const ROADMAP = [
    { step: "Upload 3 portfolio photos", done: true },
    { step: "Get your first 5-star review", done: true },
    { step: "Complete your profile skills", done: false },
    { step: "Enable digital invoicing", done: false },
    { step: "Bid on 10 jobs", done: false },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={itemFade} style={{ marginBottom: 28 }}>
        <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: T.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>AI Job Tracker</div>
        <div style={{ fontSize: 14, color: T.t2 }}>Track applications, win rates, and get personalised improvement suggestions.</div>
      </motion.div>

      <motion.div variants={itemFade} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Win Rate"     value="67%"   sub="↑ 12% this month" accent="green" />
        <StatCard label="Applications" value="12"    sub="4 this week"      accent="gold" />
        <StatCard label="Avg. Bid"     value="₦51k"  sub="Above market avg." accent="gold" />
      </motion.div>

      <motion.div variants={itemFade}>
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginBottom: 16 }}>Recent Applications</div>
          {APPS.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < APPS.length - 1 ? `1px solid ${T.bdr}` : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.t1, marginBottom: 2 }}>{a.job}</div>
                <div className="mono" style={{ fontSize: 12, color: T.t3 }}>{a.client} · {a.amt}</div>
              </div>
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
                <span style={{ color: T.t1 }}>{s.skill}</span>
                <span className="mono" style={{ color: T.t3 }}>{s.pct}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" as const }}
                  style={{ height: "100%", background: `linear-gradient(90deg, ${T.gold}, ${T.goldd})`, borderRadius: 3 }}
                />
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
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${r.done ? T.green : T.bdr2}`, background: r.done ? T.greenl : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                {r.done && <span style={{ color: T.green, fontSize: 10, fontWeight: 700 }}>✓</span>}
              </motion.div>
              <span style={{ fontSize: 14, color: r.done ? T.t3 : T.t1, textDecoration: r.done ? "line-through" : "none" }}>{r.step}</span>
            </div>
          ))}
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function ProfileSection({ role }: { role: Role }) {
  const isArtisan = role === "artisan";
  const stats = isArtisan
    ? [["₦156k", "Total Earned"], ["4.9", "Rating"], ["0", "Disputes"]]
    : [["₦80k", "Total Spent"], ["4", "Jobs Done"], ["0", "Disputes"]];

  return (
    <motion.div {...fadeUp}>
      <Card style={{ padding: 0, overflow: "hidden", maxWidth: 540 }}>
        {/* Cover */}
        <div style={{ height: 130, background: `linear-gradient(135deg, #141A26, #1C2438)`, position: "relative", borderBottom: `1px solid ${T.bdr}` }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${T.gold}15 0%, transparent 70%)` }} />
          <div style={{ position: "absolute", bottom: -40, left: 24, width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldd})`, border: `4px solid ${T.surf}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="syne" style={{ color: "#0B0F17", fontSize: 24, fontWeight: 800 }}>{isArtisan ? "KA" : "BA"}</span>
          </div>
        </div>

        <div style={{ padding: "52px 28px 28px" }}>
          <div className="syne" style={{ fontSize: 22, fontWeight: 700, color: T.t1, marginBottom: 4, letterSpacing: "-0.02em" }}>
            {isArtisan ? "Kehinde Adeyemi" : "Bola Adesanya"}
          </div>
          <div style={{ fontSize: 14, color: T.t3, marginBottom: 16 }}>
            {isArtisan ? "Tailor · Surulere, Lagos · Joined Jan 2024" : "Client · Victoria Island, Lagos · Joined Mar 2024"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            <Badge variant="green">Verified</Badge>
            <Badge variant="gold">Top Rated</Badge>
            {isArtisan && <Badge variant="muted">14 Jobs Completed</Badge>}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
            {stats.map(([v, l]) => (
              <div key={l} style={{ textAlign: "center", padding: 14, background: T.surf2, borderRadius: 10, border: `1px solid ${T.bdr}` }}>
                <div className="mono syne" style={{ fontSize: 20, fontWeight: 700, color: T.gold }}>{v}</div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>

          {isArtisan && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Specialisations</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Senator Kaftan", "Agbada", "Bridal Gown", "Native Attire"].map((s) => <Badge key={s} variant="muted">{s}</Badge>)}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Reviews</div>
            {[
              { name: "Bola A.", text: "Excellent work, very professional. Kaftan was perfect.", rating: 5 },
              { name: "Ngozi O.", text: "Gate welding done on time. Would hire again.", rating: 5 },
            ].map((r, i) => (
              <div key={i} style={{ background: T.surf2, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{r.name}</div>
                  <div style={{ color: T.gold, fontSize: 12, letterSpacing: 2 }}>{"★".repeat(r.rating)}</div>
                </div>
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [role, setRole] = useState<Role>("artisan");
  const [section, setSection] = useState<Section>("dashboard");
  const [toast, setToastMsg] = useState("");

  useEffect(() => {
    const tag = document.createElement("style");
    tag.innerHTML = GLOBAL_CSS;
    document.head.appendChild(tag);
    return () => { document.head.removeChild(tag); };
  }, []);

  const showToast: ToastFn = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  }, []);

  const handleLogin   = (r: Role) => { setRole(r); setScreen("onboard"); };
  const handleDone    = () => { setScreen("app"); setSection("dashboard"); };
  const handleLogout  = () => { setScreen("auth"); setSection("dashboard"); };

  if (screen === "auth")    return <><AuthPage onLogin={handleLogin} /><style>{GLOBAL_CSS}</style></>;
  if (screen === "onboard") return <><OnboardingPage role={role} onComplete={handleDone} /><Toast msg={toast} /></>;

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <DashboardSection role={role} onNav={setSection} />;
      case "jobs":      return <JobsSection role={role} showToast={showToast} />;
      case "pricing":   return <PricingSection />;
      case "bidding":   return <BiddingSection showToast={showToast} />;
      case "wallet":    return <WalletSection showToast={showToast} />;
      case "messages":  return <MessagesSection />;
      case "tracker":   return <TrackerSection />;
      case "profile":   return <ProfileSection role={role} />;
      default:          return <DashboardSection role={role} onNav={setSection} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <Sidebar role={role} active={section} onNav={setSection} onLogout={handleLogout} />
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px", paddingBottom: 64 }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <AnimatePresence mode="wait">
            <motion.div key={section} {...fadeUp}>
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <Toast msg={toast} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// BACKEND INTEGRATION GUIDE FOR YOUR DEVELOPER
// ════════════════════════════════════════════════════════════════════════════════
//
// ── 1. SQUAD PAYMENT API ──────────────────────────────────────────────────────
//
// WHAT IT DOES: Squad handles payment collection, escrow holding, and withdrawal.
//
// ENDPOINTS YOU NEED:
//
// A) Initiate Payment (client pays into escrow)
//    POST https://sandbox-api-d.squadco.com/transaction/initiate
//    Headers: { Authorization: "Bearer YOUR_SECRET_KEY" }
//    Body: {
//      amount: 2100000,           // in kobo (₦21,000 × 100)
//      email: "client@email.com",
//      currency: "NGN",
//      transaction_ref: "DEALR_JOB_ID_UNIQUE",
//      callback_url: "https://yourapp.com/payment/callback",
//      metadata: { job_id: "...", artisan_id: "...", client_id: "..." }
//    }
//    Response: { checkout_url: "https://pay.squadco.com/..." }
//    → Redirect client to checkout_url
//
// B) Verify Payment (webhook or manual check)
//    GET https://sandbox-api-d.squadco.com/transaction/verify/{transaction_ref}
//    → On success, mark job status as "escrow" in your DB
//
// C) Initiate Transfer to Artisan (release escrow after delivery confirmed)
//    POST https://sandbox-api-d.squadco.com/payout/initiate
//    Body: {
//      transaction_ref: "PAYOUT_UNIQUE_REF",
//      amount: 2100000,
//      bank_code: "058",          // artisan's bank code
//      account_number: "1234567890",
//      account_name: "Kehinde Adeyemi",
//      currency_id: "NGN",
//      remark: "Dealr job payment — Senator kaftan"
//    }
//
// D) Webhook Events to handle on your backend:
//    - "charge.success"   → update job to "escrow", notify artisan
//    - "transfer.success" → update job to "done", notify both parties
//    - "transfer.failed"  → alert admin, retry logic
//
// Squad Docs: https://squadinc.gitbook.io/squad-api-documentation
// Test cards: 5063 5158 0430 5099 (CVV 081, Exp 08/32, PIN 1234)
//
// ── 2. CLAUDE AI API (Anthropic) ─────────────────────────────────────────────
//
// WHAT IT DOES: Powers the Price Advisor chat and Job Price Generator.
//
// BACKEND ROUTE (Node/Express example):
//
//   POST /api/price-check
//   Body: { message: "I want to charge ₦120,000 for bridal makeup..." }
//
//   const Anthropic = require("@anthropic-ai/sdk");
//   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//
//   const SYSTEM_PROMPT = `
//     You are a Nigerian artisan market pricing expert for the Dealr app.
//     You know pricing for Lagos, Abuja, Port Harcourt markets.
//     Respond ONLY with a JSON object:
//     {
//       "verdict": "Fair" | "Too Low" | "Too High",
//       "valid": true | false,
//       "range": "₦X – ₦Y",
//       "breakdown": { "Item": "₦Amount" },
//       "note": "Plain English advice in 1-2 sentences"
//     }
//     Currency is Naira (₦). Be specific to Nigerian market rates.
//     Consider location, urgency, skill level, and materials.
//   `;
//
//   const response = await client.messages.create({
//     model: "claude-opus-4-6",
//     max_tokens: 512,
//     system: SYSTEM_PROMPT,
//     messages: [{ role: "user", content: body.message }]
//   });
//
//   // Parse JSON from response.content[0].text
//   return JSON.parse(response.content[0].text);
//
// GENERATE JOB PRICE (for the "Create Job" flow):
//   Body: { description: "Senator kaftan with hand embroidery, due tomorrow" }
//   System prompt should return: { price, range, breakdown[], agreement_clauses[] }
//
// ── 3. DATABASE SCHEMA (key tables) ──────────────────────────────────────────
//
//   users      { id, name, email, role, location, squad_account_id, created_at }
//   jobs       { id, artisan_id, client_id, description, amount_kobo, status,
//                squad_transaction_ref, created_at }
//                status: "draft" | "pending_payment" | "escrow" | "delivered" | "done" | "dispute"
//   bids       { id, job_id, artisan_id, amount_kobo, placed_at, won }
//   messages   { id, from_id, to_id, job_id, text, sent_at }
//   reviews    { id, reviewer_id, reviewee_id, job_id, rating, text }
//
// ── 4. ENV VARS NEEDED ────────────────────────────────────────────────────────
//
//   ANTHROPIC_API_KEY=sk-ant-...
//   SQUAD_SECRET_KEY=sk_live_...   (or sk_test_... for sandbox)
//   SQUAD_PUBLIC_KEY=pk_live_...
//   DATABASE_URL=postgres://...
//   WEBHOOK_SECRET=...
//
// ── 5. FRONTEND API CALLS TO REPLACE ─────────────────────────────────────────
//
//   In PricingSection:  replace the setTimeout + PRICE_RESPONSES mock
//     → fetch("/api/price-check", { method:"POST", body: JSON.stringify({message: t}) })
//
//   In JobsSection:     replace genPrice setTimeout
//     → fetch("/api/generate-price", { method:"POST", body: JSON.stringify({description: jobDesc}) })
//
//   In JobsSection:     "Confirm Delivery" button
//     → fetch("/api/jobs/:id/confirm", { method:"POST" })
//       which triggers Squad payout to artisan
//
//   In WalletSection:   "Withdraw Now" button
//     → fetch("/api/wallet/withdraw", { method:"POST", body: JSON.stringify({amount, bank_code, account_number, currency}) })
//
//   In BiddingSection:  "Place Bid" button
//     → fetch("/api/bids", { method:"POST", body: JSON.stringify({job_id, amount}) })
//
// ════════════════════════════════════════════════════════════════════════════════