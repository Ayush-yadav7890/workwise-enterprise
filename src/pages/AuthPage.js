// src/pages/AuthPage.js
import { useState } from "react";
import {
  loginUser,
  registerUser,
  loginWithGoogle,
  resetPassword,
} from "../firebase";

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
`;

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const clearState = () => { setError(""); setInfo(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearState();
    if (mode === "register" && password !== confirm) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      if (mode === "login") await loginUser(email, password);
      else if (mode === "register") await registerUser(name, email, password);
      else if (mode === "forgot") {
        await resetPassword(email);
        setInfo("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    clearState();
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <style>{FONT + globalCSS}</style>

      {/* Background */}
      <div style={styles.bgGrid} />
      <div style={styles.bgGlowLeft} />
      <div style={styles.bgGlowRight} />

      {/* Card */}
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>◈</div>
          <div>
            <div style={styles.logoName}>WorkWise Enterprise</div>
            <div style={styles.logoSub}>AI Office Intelligence Platform</div>
          </div>
        </div>

        {/* Title */}
        <h2 style={styles.title}>
          {mode === "login" && "Welcome back"}
          {mode === "register" && "Create your account"}
          {mode === "forgot" && "Reset password"}
        </h2>
        <p style={styles.sub}>
          {mode === "login" && "Sign in to access your AI workspace"}
          {mode === "register" && "Join the enterprise AI platform"}
          {mode === "forgot" && "Enter your email to receive a reset link"}
        </p>

        {/* Error / Info */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {info && <div style={styles.infoBox}>{info}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "register" && (
            <Field label="Full Name" type="text" value={name} onChange={setName} placeholder="Jane Doe" required />
          )}
          <Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
          {mode !== "forgot" && (
            <Field label="Password" type={showPass ? "text" : "password"} value={password} onChange={setPassword} placeholder="••••••••" required
              suffix={<span style={styles.eyeBtn} onClick={() => setShowPass(s => !s)}>{showPass ? "🙈" : "👁"}</span>}
            />
          )}
          {mode === "register" && (
            <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required />
          )}

          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: -6, marginBottom: 8 }}>
              <span style={styles.link} onClick={() => { setMode("forgot"); clearState(); }}>Forgot password?</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.primaryBtn}>
            {loading ? <span style={styles.spinner} /> : (
              mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link"
            )}
          </button>
        </form>

        {/* Divider */}
        {mode !== "forgot" && (
          <>
            <div style={styles.divider}><span>or continue with</span></div>
            <button onClick={handleGoogle} disabled={loading} style={styles.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {/* Footer link */}
        <div style={styles.footerRow}>
          {mode === "login" && (
            <span>Don't have an account? <span style={styles.link} onClick={() => { setMode("register"); clearState(); }}>Sign up free</span></span>
          )}
          {mode === "register" && (
            <span>Already have an account? <span style={styles.link} onClick={() => { setMode("login"); clearState(); }}>Sign in</span></span>
          )}
          {mode === "forgot" && (
            <span><span style={styles.link} onClick={() => { setMode("login"); clearState(); }}>← Back to sign in</span></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder, required, suffix }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{ ...styles.input, paddingRight: suffix ? 40 : 14 }}
        />
        {suffix && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 15 }}>{suffix}</div>}
      </div>
    </div>
  );
}

// ── Error codes → friendly messages ──────────────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Styles ────────────────────────────────────────────────────────────────────
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080C15; }
  input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #111827 inset !important; -webkit-text-fill-color: #C8CEDC !important; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
`;

const styles = {
  page: {
    minHeight: "100vh", background: "#080C15",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, position: "relative", overflow: "hidden",
  },
  bgGrid: {
    position: "fixed", inset: 0,
    backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
    backgroundSize: "52px 52px", pointerEvents: "none",
  },
  bgGlowLeft: {
    position: "fixed", top: "-20%", left: "-10%",
    width: 600, height: 600,
    background: "radial-gradient(circle,rgba(74,144,217,0.07) 0%,transparent 65%)",
    pointerEvents: "none",
  },
  bgGlowRight: {
    position: "fixed", bottom: "-15%", right: "-5%",
    width: 500, height: 500,
    background: "radial-gradient(circle,rgba(91,173,143,0.05) 0%,transparent 65%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative", zIndex: 1,
    background: "rgba(255,255,255,0.028)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, padding: "36px 38px",
    width: "100%", maxWidth: 440,
    backdropFilter: "blur(16px)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
    animation: "fadeIn 0.35s ease both",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  logoIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: "linear-gradient(135deg,#142444,#1e3d72)",
    border: "1px solid rgba(74,144,217,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, color: "#4A90D9",
    boxShadow: "0 0 20px rgba(74,144,217,0.2)",
  },
  logoName: { fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: "#E8EDF8" },
  logoSub: { fontSize: 10, color: "rgba(140,158,196,0.5)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 },
  title: { fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#E8EDF8", marginBottom: 6 },
  sub: { fontSize: 13, color: "rgba(140,158,196,0.6)", marginBottom: 22 },
  form: { marginTop: 4 },
  label: { display: "block", fontSize: 12, color: "rgba(140,158,196,0.65)", letterSpacing: 0.6, marginBottom: 6, textTransform: "uppercase" },
  input: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    padding: "11px 14px", fontSize: 13.5, color: "#C8CEDC",
    fontFamily: "'DM Sans',sans-serif", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  eyeBtn: { fontSize: 16, userSelect: "none" },
  primaryBtn: {
    width: "100%", padding: "12px", borderRadius: 10, marginTop: 4,
    background: "linear-gradient(135deg,#1a55A0,#2870CC)",
    border: "1px solid rgba(74,144,217,0.4)", color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", letterSpacing: 0.4,
    boxShadow: "0 0 20px rgba(74,144,217,0.22)",
    transition: "all 0.18s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
  spinner: {
    width: 18, height: 18, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff", animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  divider: {
    textAlign: "center", margin: "18px 0 14px",
    position: "relative", fontSize: 11,
    color: "rgba(140,158,196,0.35)", letterSpacing: 1,
  },
  googleBtn: {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#B0BAD0", fontSize: 13.5, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    transition: "all 0.18s",
  },
  footerRow: {
    textAlign: "center", marginTop: 22,
    fontSize: 13, color: "rgba(140,158,196,0.5)",
  },
  link: { color: "#4A90D9", cursor: "pointer", fontWeight: 600 },
  errorBox: {
    background: "rgba(220,80,80,0.1)", border: "1px solid rgba(220,80,80,0.25)",
    borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#F08080",
    marginBottom: 14,
  },
  infoBox: {
    background: "rgba(91,173,143,0.1)", border: "1px solid rgba(91,173,143,0.25)",
    borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#5BAD8F",
    marginBottom: 14,
  },
};
