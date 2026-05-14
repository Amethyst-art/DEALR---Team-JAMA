import { useState } from "react";

const COLORS = {
  primary: "#1A7A4A",
  primaryDark: "#145E38",
  primaryLight: "#E8F5EE",
  primaryMid: "#2E9E62",
  bg: "#E8F5EE",
  white: "#FFFFFF",
  dark: "#1A1A1A",
  muted: "#5A6672",
  border: "#C3DFD0",
  borderLight: "#D8EDE2",
  danger: "#C0392B",
  dangerLight: "#FDECEA",
  warning: "#D4891A",
  warningLight: "#FEF3E2",
  success: "#1A7A4A",
  successLight: "#E8F5EE",
};

const styles = {
  app: {
    fontFamily: "'DM Sans', sans-serif",
    background: COLORS.bg,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 0 40px 0",
  },
  phone: {
    width: "100%",
    maxWidth: 420,
    background: COLORS.white,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflowX: "hidden",
  },
  topBar: {
    background: COLORS.white,
    borderBottom: `1px solid ${COLORS.borderLight}`,
    padding: "16px 20px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontWeight: 700,
    fontSize: 22,
    color: COLORS.primary,
    letterSpacing: "-0.5px",
  },
  logoAccent: {
    color: COLORS.dark,
  },
  content: {
    padding: "20px 20px 32px",
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: "0.7px",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "13px 14px",
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    color: COLORS.dark,
    background: COLORS.white,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    resize: "vertical",
  },
  textarea: {
    width: "100%",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "13px 14px",
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    color: COLORS.dark,
    background: COLORS.white,
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    minHeight: 110,
    lineHeight: 1.55,
  },
  btn: {
    width: "100%",
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: 14,
    padding: "15px 20px",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.2px",
    transition: "background 0.18s, transform 0.12s",
  },
  btnOutline: {
    width: "100%",
    background: "transparent",
    color: COLORS.primary,
    border: `2px solid ${COLORS.primary}`,
    borderRadius: 14,
    padding: "13px 20px",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.2px",
  },
  btnSmall: {
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
  card: {
    background: COLORS.white,
    border: `1.5px solid ${COLORS.borderLight}`,
    borderRadius: 16,
    padding: "16px 18px",
    marginBottom: 14,
  },
  cardGreen: {
    background: COLORS.primaryLight,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "16px 18px",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.dark,
    marginBottom: 6,
    letterSpacing: "-0.4px",
  },
  sectionSub: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 24,
    lineHeight: 1.5,
  },
  chip: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 13px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    background: active ? COLORS.primary : COLORS.white,
    color: active ? COLORS.white : COLORS.muted,
    border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  }),
  pill: (color) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: color === "green" ? COLORS.primaryLight : color === "amber" ? COLORS.warningLight : COLORS.dangerLight,
    color: color === "green" ? COLORS.primary : color === "amber" ? COLORS.warning : COLORS.danger,
  }),
  divider: {
    borderTop: `1px solid ${COLORS.borderLight}`,
    margin: "16px 0",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  navBar: {
    position: "sticky",
    bottom: 0,
    background: COLORS.white,
    borderTop: `1px solid ${COLORS.borderLight}`,
    display: "flex",
    justifyContent: "space-around",
    padding: "10px 0 14px",
    zIndex: 10,
  },
  navItem: (active) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    fontSize: 11,
    fontWeight: active ? 700 : 400,
    color: active ? COLORS.primary : COLORS.muted,
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: "'DM Sans', sans-serif",
  }),
  statBox: {
    flex: 1,
    background: COLORS.primaryLight,
    borderRadius: 14,
    padding: "14px 12px",
    textAlign: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.primary,
    letterSpacing: "-0.5px",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  timelineStep: (done, active) => ({
    display: "flex",
    gap: 14,
    paddingBottom: done || active ? 20 : 0,
  }),
  timelineDot: (done, active) => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: done ? COLORS.primary : active ? COLORS.primaryLight : "#F0F0F0",
    border: `2px solid ${done ? COLORS.primary : active ? COLORS.primary : "#DDD"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  }),
  timelineLine: (done) => ({
    width: 2,
    background: done ? COLORS.primary : COLORS.borderLight,
    flex: 1,
    minHeight: 24,
    margin: "0 auto",
  }),
};

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const paths = {
    briefcase: "M6 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3V4zm2 0v2h4V4H8zM4 8v2h16V8H4zm0 4v5h16v-5H4z",
    zap: "M13 2L4.09 12.96A1 1 0 0 0 5 14.5h5.5L11 22l9.91-10.96A1 1 0 0 0 20 9.5h-5.5L13 2z",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    check: "M20 6L9 17l-5-5",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    wallet: "M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2M16 11a1 1 0 1 0 2 0 1 1 0 0 0-2 0z",
    alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    copy: "M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2M10 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    history: "M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3.5M3 4v4h4",
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    arrowRight: "M5 12h14M12 5l7 7-7 7",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
};

// ─── Logo ────────────────────────────────────────────────────────────────────
const Logo = () => (
  <span style={styles.logo}>
    DEAL<span style={{ color: COLORS.primary }}>R</span>
    <span style={{ color: COLORS.border, fontWeight: 400, fontSize: 11, marginLeft: 4, verticalAlign: "middle", letterSpacing: 0 }}>beta</span>
  </span>
);

// ─── TopBar ──────────────────────────────────────────────────────────────────
const TopBar = ({ right }) => (
  <div style={styles.topBar}>
    <Logo />
    {right}
  </div>
);

// ─── VIEW TOGGLE ─────────────────────────────────────────────────────────────
const ViewToggle = ({ view, setView }) => (
  <div style={{ display: "flex", gap: 6, background: COLORS.primaryLight, borderRadius: 12, padding: 4 }}>
    {["artisan", "client"].map((v) => (
      <button
        key={v}
        onClick={() => setView(v)}
        style={{
          flex: 1,
          padding: "8px 0",
          borderRadius: 9,
          border: "none",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          background: view === v ? COLORS.primary : "transparent",
          color: view === v ? COLORS.white : COLORS.muted,
          transition: "all 0.18s",
        }}
      >
        {v === "artisan" ? "🔨 Artisan" : "👤 Client"}
      </button>
    ))}
  </div>
);

// ─── SCREEN 1: Job Input ──────────────────────────────────────────────────────
const JobInputScreen = ({ onNext }) => {
  const [desc, setDesc] = useState("");
  const [trade, setTrade] = useState("plumbing");
  const [loading, setLoading] = useState(false);

  const trades = [
    { id: "plumbing", label: "🔧 Plumbing" },
    { id: "electrical", label: "⚡ Electrical" },
    { id: "carpentry", label: "🪚 Carpentry" },
    { id: "painting", label: "🖌️ Painting" },
    { id: "tiling", label: "🏠 Tiling" },
    { id: "welding", label: "🔩 Welding" },
  ];

  const examplePrompts = [
    "Fix leaking pipe under kitchen sink",
    "Paint 3-bedroom flat, walls only",
    "Wire new socket for AC unit",
  ];

  const handleGenerate = () => {
    if (!desc.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onNext({ desc, trade });
    }, 1800);
  };

  return (
    <>
      <TopBar right={<span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>Step 1 of 3</span>} />
      <div style={styles.content}>
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionTitle}>Describe the job</div>
          <div style={styles.sectionSub}>Write in plain English or Pidgin — our AI go handle the rest.</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={styles.label}>Trade Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {trades.map((t) => (
              <button key={t.id} style={styles.chip(trade === t.id)} onClick={() => setTrade(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Job Description</label>
          <textarea
            style={styles.textarea}
            placeholder="E.g. Fix the pipe wey dey leak for my kitchen since two days ago, water dey mess everywhere..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {!desc && (
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Quick Examples</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {examplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setDesc(p)}
                  style={{
                    background: COLORS.primaryLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: COLORS.primary,
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={styles.label}>Location (Optional)</label>
          <input style={{ ...styles.input, marginBottom: 0 }} placeholder="E.g. Yaba, Lagos" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={styles.label}>Preferred Timeline</label>
          <input style={{ ...styles.input, marginBottom: 0 }} placeholder="E.g. This weekend, ASAP, flexible..." />
        </div>

        <div style={{ height: 24 }} />

        <button
          style={{ ...styles.btn, opacity: !desc.trim() ? 0.55 : 1 }}
          onClick={handleGenerate}
          disabled={!desc.trim() || loading}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              AI dey calculate price...
            </span>
          ) : (
            "Generate Fair Price ⚡"
          )}
        </button>

        <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
          Powered by real market data for your trade + location
        </p>
      </div>
    </>
  );
};

// ─── SCREEN 2: Price & Agreement ──────────────────────────────────────────────
const PriceAgreementScreen = ({ jobData, onNext, onBack }) => {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const priceMin = 12500;
  const priceMax = 18000;
  const recommended = 15000;

  const breakdown = [
    { label: "Labour (estimated 4–6 hrs)", amount: "₦9,000" },
    { label: "Materials & parts", amount: "₦4,500" },
    { label: "Transport / call-out", amount: "₦1,500" },
    { label: "DEALR platform fee (0%)", amount: "₦0" },
  ];

  const agreement = [
    `Job: Fix leaking pipe under kitchen sink, Yaba Lagos`,
    `Agreed Price: ₦${recommended.toLocaleString()} (held in escrow until delivery)`,
    `Timeline: Work starts within 24 hrs of payment`,
    `Release: Client confirms delivery before funds are released`,
  ];

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <TopBar right={<span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>Step 2 of 3</span>} />
      <div style={styles.content}>
        <div style={{ marginBottom: 20 }}>
          <div style={styles.sectionTitle}>AI Price Estimate</div>
          <div style={styles.sectionSub}>Based on current market rates in Lagos for plumbing work.</div>
        </div>

        {/* Price range card */}
        <div style={{ background: COLORS.primaryLight, border: `2px solid ${COLORS.primary}`, borderRadius: 18, padding: "20px 18px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
            Fair Market Range
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.dark, letterSpacing: "-1px", marginBottom: 2 }}>
            ₦12,500 – ₦18,000
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted }}>Recommended: <strong style={{ color: COLORS.primary }}>₦15,000</strong></div>

          <div style={{ marginTop: 14, height: 8, background: COLORS.border, borderRadius: 4, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: "0%", right: "0%", top: 0, bottom: 0, background: COLORS.primaryLight, borderRadius: 4 }} />
            <div style={{ position: "absolute", left: "33%", width: 4, height: "100%", background: COLORS.primary, borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: COLORS.muted }}>
            <span>Min ₦12.5k</span>
            <span style={{ color: COLORS.primary, fontWeight: 600 }}>▲ Recommended</span>
            <span>Max ₦18k</span>
          </div>
        </div>

        {/* Cost breakdown */}
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="tag" size={15} color={COLORS.primary} /> Cost Breakdown
          </div>
          {breakdown.map((item, i) => (
            <div key={i} style={{ ...styles.row, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: COLORS.muted }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>{item.amount}</span>
            </div>
          ))}
          <div style={styles.divider} />
          <div style={styles.row}>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.dark }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>₦15,000</span>
          </div>
        </div>

        {/* Agreement */}
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="shield" size={15} color={COLORS.primary} /> Job Agreement
          </div>
          {agreement.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: COLORS.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.primary }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 13, color: COLORS.dark, lineHeight: 1.5 }}>{line}</span>
            </div>
          ))}
        </div>

        {!confirmed ? (
          <button style={styles.btn} onClick={() => setConfirmed(true)}>
            Confirm Price & Get Link ✓
          </button>
        ) : (
          <>
            {/* Shareable link */}
            <div style={{ background: COLORS.primaryLight, border: `1.5px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 8 }}>Shareable Client Link</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: COLORS.primary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  dealr.ng/job/plmb-4a7f2c
                </div>
                <button onClick={handleCopy} style={{ ...styles.btnSmall, borderRadius: 9, padding: "9px 12px", background: copied ? COLORS.primaryDark : COLORS.primary, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <Icon name={copied ? "check" : "copy"} size={14} color={COLORS.white} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <button style={styles.btn} onClick={onNext}>
              View Job Tracker →
            </button>
          </>
        )}
      </div>
    </>
  );
};

// ─── SCREEN 3: Job Tracker ────────────────────────────────────────────────────
const JobTrackerScreen = () => {
  const [flagging, setFlagging] = useState(false);

  const statusSteps = [
    { id: "pending", label: "Pending Payment", sub: "Awaiting client payment into escrow", done: true, active: false },
    { id: "held", label: "Funds Held in Escrow", sub: "₦15,000 secured • Squad escrow active", done: true, active: false },
    { id: "delivered", label: "Job Delivered", sub: "Waiting for client confirmation", done: false, active: true },
    { id: "paid", label: "Paid Out", sub: "Funds released to your account", done: false, active: false },
  ];

  const jobs = [
    { id: "#PLB-4A7F", title: "Fix leaking kitchen pipe", amount: "₦15,000", status: "In Progress", statusColor: "amber", time: "Today" },
    { id: "#ELC-3B2D", title: "Wire AC socket, Ikeja", amount: "₦22,000", status: "Paid", statusColor: "green", time: "Yesterday" },
    { id: "#PNT-1E9A", title: "Paint 2-room apartment", amount: "₦45,000", status: "Paid", statusColor: "green", time: "Mon" },
  ];

  return (
    <>
      <TopBar right={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="user" size={16} color={COLORS.primary} />
          </div>
        </div>
      } />

      <div style={styles.content}>
        {/* Earnings summary */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 12 }}>THIS MONTH</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={styles.statBox}>
              <div style={styles.statNum}>₦82k</div>
              <div style={styles.statLabel}>Earned</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statNum}>7</div>
              <div style={styles.statLabel}>Jobs Done</div>
            </div>
            <div style={{ ...styles.statBox, background: COLORS.warningLight }}>
              <div style={{ ...styles.statNum, color: COLORS.warning }}>1</div>
              <div style={styles.statLabel}>Active</div>
            </div>
          </div>
        </div>

        {/* Active job tracker */}
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="clock" size={14} color={COLORS.primary} />
          Active Job — Plumbing
        </div>

        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={styles.row}>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark }}>Fix leaking kitchen pipe</span>
              <span style={styles.pill("amber")}>In Progress</span>
            </div>
            <span style={{ fontSize: 13, color: COLORS.muted }}>Ref: #PLB-4A7F • Yaba, Lagos</span>
          </div>

          <div style={styles.divider} />

          {/* Timeline */}
          <div style={styles.timeline}>
            {statusSteps.map((step, i) => (
              <div key={step.id}>
                <div style={styles.timelineStep(step.done, step.active)}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28 }}>
                    <div style={styles.timelineDot(step.done, step.active)}>
                      {step.done && <Icon name="check" size={12} color={COLORS.white} />}
                      {step.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.primary }} />}
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div style={{ flex: 1, width: 2, background: step.done ? COLORS.primary : COLORS.borderLight, minHeight: 20 }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: step.active ? 700 : 600, color: step.done || step.active ? COLORS.dark : COLORS.muted }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{step.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          {!flagging ? (
            <button
              onClick={() => setFlagging(true)}
              style={{ width: "100%", background: "transparent", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "10px", fontSize: 13, color: COLORS.muted, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Icon name="alert" size={14} color={COLORS.muted} />
              Flag a Dispute
            </button>
          ) : (
            <div style={{ background: COLORS.dangerLight, border: `1.5px solid #F0C0BB`, borderRadius: 12, padding: "14px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.danger, marginBottom: 6 }}>Report a Dispute</div>
              <textarea style={{ ...styles.textarea, minHeight: 70, marginBottom: 10, border: `1px solid #F0C0BB`, background: COLORS.white, fontSize: 13 }} placeholder="Describe the issue briefly..." />
              <button style={{ ...styles.btn, background: COLORS.danger, fontSize: 14, padding: "11px" }}>Submit Dispute</button>
            </div>
          )}
        </div>

        {/* Job history */}
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="history" size={14} color={COLORS.primary} />
          Job History
        </div>

        {jobs.map((job) => (
          <div key={job.id} style={{ ...styles.card, marginBottom: 10 }}>
            <div style={styles.row}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark }}>{job.title}</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{job.id} · {job.time}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{job.amount}</div>
                <span style={{ ...styles.pill(job.statusColor), marginTop: 4, display: "inline-block" }}>{job.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

// ─── CLIENT SCREEN 1: Job Review ──────────────────────────────────────────────
const ClientReviewScreen = ({ onNext }) => {
  const terms = [
    { label: "Job", value: "Fix leaking pipe under kitchen sink" },
    { label: "Location", value: "Yaba, Lagos" },
    { label: "Artisan", value: "Chukwuemeka O. ⭐ 4.8 (43 jobs)" },
    { label: "Timeline", value: "Work starts within 24 hrs of payment" },
    { label: "Agreed Price", value: "₦15,000" },
    { label: "Escrow", value: "Funds held securely via Squad" },
    { label: "Release", value: "You confirm delivery before payment releases" },
  ];

  return (
    <>
      <TopBar right={<span style={styles.pill("green")}>Secure Job Link</span>} />
      <div style={styles.content}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: COLORS.primary }}>C</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark }}>Chukwuemeka O.</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>Plumber · Yaba, Lagos</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F5A623" }}>⭐ 4.8</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>43 jobs</div>
            </div>
          </div>

          <div style={{ background: COLORS.primaryLight, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="shield" size={16} color={COLORS.primary} />
            <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 500 }}>DEALR-verified fair price • Protected by Squad escrow</span>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, marginBottom: 12 }}>Job Terms</div>

        <div style={{ ...styles.card, marginBottom: 16 }}>
          {terms.map((t, i) => (
            <div key={i}>
              <div style={{ ...styles.row, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, width: 100, flexShrink: 0, paddingTop: 1 }}>{t.label.toUpperCase()}</span>
                <span style={{ fontSize: 13, fontWeight: t.label === "Agreed Price" ? 700 : 500, color: t.label === "Agreed Price" ? COLORS.primary : COLORS.dark, textAlign: "right", flex: 1 }}>{t.value}</span>
              </div>
              {i < terms.length - 1 && <div style={{ ...styles.divider, margin: "8px 0" }} />}
            </div>
          ))}
        </div>

        {/* Cost breakdown preview */}
        <div style={{ ...styles.card, marginBottom: 20, background: COLORS.primaryLight }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>PRICE BREAKDOWN</div>
          {[["Labour (4–6 hrs)", "₦9,000"], ["Materials", "₦4,500"], ["Call-out fee", "₦1,500"]].map(([l, v]) => (
            <div key={l} style={{ ...styles.row, marginBottom: 7 }}>
              <span style={{ fontSize: 13, color: COLORS.muted }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, color: COLORS.dark }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: COLORS.primary }}>₦15,000</span>
          </div>
        </div>

        <button style={styles.btn} onClick={onNext}>
          Agree & Pay ₦15,000 →
        </button>
        <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          Your payment is held safely in escrow until you confirm the job is done.
        </p>
      </div>
    </>
  );
};

// ─── CLIENT SCREEN 2: Payment & Confirmation ──────────────────────────────────
const ClientPaymentScreen = () => {
  const [step, setStep] = useState("pay"); // pay | held | confirm | done

  const steps = {
    pay: {
      title: "Secure Payment",
      sub: "Pay ₦15,000 into Squad escrow. Artisan gets paid only when you confirm delivery.",
    },
    held: {
      title: "Funds Secured 🔒",
      sub: "₦15,000 is held in your escrow. Artisan has been notified to start work.",
    },
    confirm: {
      title: "Confirm Delivery",
      sub: "Has the job been completed to your satisfaction?",
    },
    done: {
      title: "Payment Released ✅",
      sub: "₦15,000 has been released to Chukwuemeka. Thank you for using DEALR!",
    },
  };

  const current = steps[step];

  return (
    <>
      <TopBar right={<span style={styles.pill(step === "done" ? "green" : step === "pay" ? "amber" : "green")}>{step === "done" ? "Complete" : step === "held" || step === "confirm" ? "Funds Held" : "Awaiting Payment"}</span>} />
      <div style={styles.content}>
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionTitle}>{current.title}</div>
          <div style={styles.sectionSub}>{current.sub}</div>
        </div>

        {/* Status indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 28 }}>
          {["pay", "held", "confirm", "done"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: s === step ? COLORS.primary : ["pay", "held", "confirm", "done"].indexOf(s) < ["pay", "held", "confirm", "done"].indexOf(step) ? COLORS.primaryMid : COLORS.borderLight,
                border: `2px solid ${s === step ? COLORS.primary : COLORS.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {["pay", "held", "confirm", "done"].indexOf(s) < ["pay", "held", "confirm", "done"].indexOf(step) ? (
                  <Icon name="check" size={14} color={COLORS.white} />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: s === step ? COLORS.white : COLORS.muted }}>{i + 1}</span>
                )}
              </div>
              {i < 3 && <div style={{ width: 28, height: 2, background: ["pay", "held", "confirm", "done"].indexOf(s) < ["pay", "held", "confirm", "done"].indexOf(step) ? COLORS.primary : COLORS.borderLight }} />}
            </div>
          ))}
        </div>

        {step === "pay" && (
          <>
            <div style={{ ...styles.card, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 12 }}>PAYMENT SUMMARY</div>
              <div style={{ ...styles.row, marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: COLORS.muted }}>Fix leaking kitchen pipe</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.dark }}>₦15,000</span>
              </div>
              <div style={{ ...styles.row, marginBottom: 0 }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>DEALR fee</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary }}>₦0 (free)</span>
              </div>
              <div style={styles.divider} />
              <div style={{ ...styles.row, marginBottom: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.dark }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: COLORS.primary }}>₦15,000</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Pay with</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "transfer", label: "💳 Bank Transfer (Squad)", desc: "Instant • Secure escrow" },
                  { id: "ussd", label: "📱 USSD", desc: "*737# *901# and more" },
                  { id: "card", label: "🔐 Debit Card", desc: "Visa, Mastercard, Verve" },
                ].map((method) => (
                  <label key={method.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `1.5px solid ${method.id === "transfer" ? COLORS.primary : COLORS.border}`, borderRadius: 12, cursor: "pointer", background: method.id === "transfer" ? COLORS.primaryLight : COLORS.white }}>
                    <input type="radio" name="method" defaultChecked={method.id === "transfer"} style={{ accentColor: COLORS.primary }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark }}>{method.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>{method.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button style={styles.btn} onClick={() => setStep("held")}>
              Pay ₦15,000 Securely →
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
              <Icon name="shield" size={14} color={COLORS.muted} />
              <span style={{ fontSize: 12, color: COLORS.muted }}>Protected by Squad escrow · SSL encrypted</span>
            </div>
          </>
        )}

        {step === "held" && (
          <>
            <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: COLORS.primaryLight, border: `3px solid ${COLORS.primary}`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="shield" size={32} color={COLORS.primary} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.primary, letterSpacing: "-1px" }}>₦15,000</div>
              <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 4 }}>Held securely in escrow</div>
            </div>

            <div style={{ ...styles.card, marginBottom: 20 }}>
              {[
                ["Status", "Funds held"],
                ["Artisan", "Chukwuemeka O."],
                ["Expected Start", "Within 24 hours"],
                ["Reference", "#PLB-4A7F"],
              ].map(([l, v]) => (
                <div key={l} style={{ ...styles.row, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.muted }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background: COLORS.warningLight, border: `1px solid #F0D5A0`, borderRadius: 12, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 8 }}>
              <Icon name="alert" size={16} color={COLORS.warning} />
              <span style={{ fontSize: 13, color: COLORS.warning, lineHeight: 1.5 }}>Only confirm delivery after you are satisfied with the work. Funds release is final.</span>
            </div>

            <button style={styles.btn} onClick={() => setStep("confirm")}>
              Artisan says job is done — Confirm →
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div style={{ ...styles.card, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 4 }}>Job completed:</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 12 }}>Fix leaking pipe under kitchen sink</div>
              <div style={{ fontSize: 13, color: COLORS.muted }}>Chukwuemeka O. has marked this job as delivered. Please confirm if you are satisfied before funds are released.</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>Rate your experience</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} style={{ flex: 1, padding: "12px 0", background: s <= 4 ? COLORS.primaryLight : COLORS.white, border: `1.5px solid ${s <= 4 ? COLORS.primary : COLORS.border}`, borderRadius: 10, fontSize: 20, cursor: "pointer" }}>
                    ⭐
                  </button>
                ))}
              </div>
              <textarea style={{ ...styles.textarea, minHeight: 80 }} placeholder="Any comments about the work? (optional)" />
            </div>

            <button style={styles.btn} onClick={() => setStep("done")}>
              Confirm Delivery & Release Funds ✓
            </button>
            <button style={{ ...styles.btnOutline, marginTop: 10 }} onClick={() => setStep("held")}>
              Flag a Dispute Instead
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <div style={{ textAlign: "center", padding: "24px 0 28px" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: COLORS.primaryLight, border: `3px solid ${COLORS.primary}`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" size={36} color={COLORS.primary} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark, letterSpacing: "-0.5px", marginBottom: 6 }}>Transaction Complete!</div>
              <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.5 }}>₦15,000 has been released to Chukwuemeka. A receipt has been sent to your email.</div>
            </div>

            <div style={{ ...styles.card, marginBottom: 20, background: COLORS.primaryLight }}>
              {[
                ["Job", "Fix leaking kitchen pipe"],
                ["Amount Paid", "₦15,000"],
                ["Artisan", "Chukwuemeka O."],
                ["Rating Given", "⭐⭐⭐⭐ (4/5)"],
                ["Date", new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })],
              ].map(([l, v]) => (
                <div key={l} style={{ ...styles.row, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.muted }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>{v}</span>
                </div>
              ))}
            </div>

            <button style={styles.btn}>
              Book Another Job on DEALR
            </button>
            <button style={{ ...styles.btnOutline, marginTop: 10 }}>
              Download Receipt
            </button>
          </>
        )}
      </div>
    </>
  );
};

// ─── Nav Bar ──────────────────────────────────────────────────────────────────
const ArtisanNav = ({ screen, setScreen }) => (
  <div style={styles.navBar}>
    {[
      { id: 0, icon: "briefcase", label: "New Job" },
      { id: 1, icon: "zap", label: "Pricing" },
      { id: 2, icon: "history", label: "Tracker" },
    ].map((item) => (
      <button key={item.id} style={styles.navItem(screen === item.id)} onClick={() => setScreen(item.id)}>
        <Icon name={item.icon} size={20} color={screen === item.id ? COLORS.primary : COLORS.muted} />
        <span>{item.label}</span>
      </button>
    ))}
  </div>
);

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("artisan");
  const [artisanScreen, setArtisanScreen] = useState(0);
  const [clientScreen, setClientScreen] = useState(0);
  const [jobData, setJobData] = useState(null);

  const handleArtisanNext = (data) => {
    setJobData(data);
    setArtisanScreen(1);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #E8F5EE; }
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea:focus, input:focus { border-color: #1A7A4A !important; outline: none; }
        button:hover { opacity: 0.92; }
      `}</style>

      <div style={styles.app}>
        {/* View toggle */}
        <div style={{ width: "100%", maxWidth: 420, padding: "14px 20px 0" }}>
          <ViewToggle view={view} setView={(v) => { setView(v); setClientScreen(0); setArtisanScreen(0); }} />
        </div>

        <div style={styles.phone}>
          {view === "artisan" && (
            <>
              {artisanScreen === 0 && <JobInputScreen onNext={handleArtisanNext} />}
              {artisanScreen === 1 && <PriceAgreementScreen jobData={jobData} onNext={() => setArtisanScreen(2)} onBack={() => setArtisanScreen(0)} />}
              {artisanScreen === 2 && <JobTrackerScreen />}
              <ArtisanNav screen={artisanScreen} setScreen={setArtisanScreen} />
            </>
          )}
          {view === "client" && (
            <>
              {clientScreen === 0 && <ClientReviewScreen onNext={() => setClientScreen(1)} />}
              {clientScreen === 1 && <ClientPaymentScreen />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
