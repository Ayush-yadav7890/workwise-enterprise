// src/pages/AgentPage.js
import { useState, useRef, useEffect } from "react";
import { logoutUser } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";

const db = getFirestore();

const TOOLS = [
  { id: "email",     icon: "✉",  label: "Draft Email",       color: "#4A90D9", prompt: "Draft a professional email for the following request. Include subject line, greeting, body, and closing:\n\n" },
  { id: "summary",   icon: "◈",  label: "Summarize",         color: "#5BAD8F", prompt: "Provide a structured executive summary with key points, main takeaways, and recommended actions:\n\n" },
  { id: "minutes",   icon: "◉",  label: "Meeting Minutes",   color: "#D4875A", prompt: "Convert the following into professional meeting minutes with agenda, discussion points, decisions made, and action items:\n\n" },
  { id: "rewrite",   icon: "⟳",  label: "Rewrite & Polish",  color: "#9B72CF", prompt: "Rewrite the following to be clearer, more professional, and more impactful. Preserve original intent:\n\n" },
  { id: "report",    icon: "▦",  label: "Business Report",   color: "#C4A44A", prompt: "Generate a comprehensive business report with executive summary, analysis, key findings, and recommendations for:\n\n" },
  { id: "actions",   icon: "✓",  label: "Action Items",      color: "#4ABEBC", prompt: "Extract and organize all action items. List each with owner (if mentioned), task, priority, and deadline:\n\n" },
  { id: "translate", icon: "⇄",  label: "Translate",         color: "#E06B9A", prompt: "Translate the following into the selected output language with a formal business tone:\n\n" },
  { id: "proposal",  icon: "◆",  label: "Write Proposal",    color: "#6B9FE0", prompt: "Write a professional business proposal including overview, objectives, approach, timeline, and outcomes for:\n\n" },
];

const TONES = ["Professional","Formal","Concise","Persuasive","Empathetic","Executive"];
const LANGS = ["English","Spanish","French","German","Chinese","Japanese","Arabic"];

const SYSTEM = `You are an elite enterprise AI Office Assistant. You are precise, professional, and highly capable.

Capabilities:
- Drafting and refining emails, memos, proposals, and executive documents
- Summarizing reports and complex content into actionable insights
- Creating structured meeting minutes with decisions and action items
- Rewriting and elevating content to boardroom-level quality
- Generating business reports, proposals, and strategic documents
- Extracting action items with priorities and deadlines
- Translating content with professional tone

Output Guidelines:
- Structure output clearly with headings, sections, or numbered lists
- Match the tone setting provided by the user
- Be thorough but avoid filler
- Begin responses immediately no filler preambles
- Use **bold** for headings and key terms`;

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

function ts() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function parseContent(text) {
  return text.split("\n").map((line, i) => {
    if (/^\*\*(.+)\*\*$/.test(line))
      return <p key={i} style={{ fontWeight: 700, color: "#E0E8F5", marginBottom: 3, marginTop: i > 0 ? 10 : 0 }}>{line.replace(/\*\*/g, "")}</p>;
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return <p key={i} style={{ marginBottom: 2 }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#D0DAF0", fontWeight: 600 }}>{p}</strong> : p)}</p>;
    }
    if (line.startsWith("• ") || line.startsWith("- "))
      return <p key={i} style={{ paddingLeft: 14, marginBottom: 2, display: "flex", gap: 6 }}><span style={{ color: "#4A90D9", flexShrink: 0 }}>›</span><span>{line.slice(2)}</span></p>;
    if (/^\d+\.\s/.test(line))
      return <p key={i} style={{ paddingLeft: 14, marginBottom: 2 }}>{line}</p>;
    if (line === "") return <div key={i} style={{ height: 5 }} />;
    return <p key={i} style={{ marginBottom: 2 }}>{line}</p>;
  });
}

export default function AgentPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `Good day${user?.displayName ? ", " + user.displayName.split(" ")[0] : ""}. I'm your enterprise AI Office Assistant — ready to handle emails, reports, summaries, meeting minutes, proposals, and more.\n\nSelect a task, set your tone preference, or type your request.`,
    time: ts(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docText, setDocText] = useState("");
  const [docName, setDocName] = useState("");
  const [activeTool, setActiveTool] = useState(null);
  const [tone, setTone] = useState("Professional");
  const [lang, setLang] = useState("English");
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();
  const taRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Load history from Firestore
  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "users", user.uid, "history"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(items);
    } catch (err) {
      console.error("Error loading history:", err);
    }
    setLoadingHistory(false);
  };

  // Save conversation to Firestore
  const saveToHistory = async (userText, aiReply, toolLabel) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "history"), {
        userText: userText.slice(0, 200),
        aiReply: aiReply.slice(0, 500),
        tool: toolLabel || "Chat",
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Error saving history:", err);
    }
  };

  // Delete history item
  const deleteHistory = async (id) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "history", id));
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  // Load history when sidebar opens
  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDocText(ev.target.result);
      setMessages(p => [...p, { role: "notice", content: `Document loaded: ${file.name}`, time: ts() }]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleTool = (tool) => {
    if (activeTool?.id === tool.id) { setActiveTool(null); setInput(""); return; }
    setActiveTool(tool);
    setInput(tool.prompt);
    taRef.current?.focus();
  };

  const copyMsg = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text, time: ts() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    const currentTool = activeTool;
    setActiveTool(null);
    setLoading(true);

    let enriched = text;
    if (docText) enriched = `[Attached Document: ${docName}]\n\n${docText}\n\n---\nUser Request: ${enriched}`;
    enriched = `[Tone: ${tone}] [Output Language: ${lang}]\n\n${enriched}`;

    const historyMsgs = [...messages]
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    historyMsgs.push({ role: "user", parts: [{ text: enriched }] });

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: historyMsgs,
            systemInstruction: { parts: [{ text: SYSTEM }] },
            generationConfig: { maxOutputTokens: 1500 },
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setMessages(p => [...p, { role: "assistant", content: `Error: ${data.error.message}`, time: ts() }]);
      } else {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to process. Please try again.";
        setMessages(p => [...p, { role: "assistant", content: reply, time: ts() }]);
        // Save to Firestore history
        await saveToHistory(text, reply, currentTool?.label);
      }

    } catch (err) {
      console.error(err);
      setMessages(p => [...p, { role: "assistant", content: "Network error. Please check your connection.", time: ts() }]);
    }

    setLoading(false);
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0].toUpperCase() || "U";

  return (
    <div style={{ minHeight: "100vh", background: "#080C15", fontFamily: "'DM Sans',sans-serif", display: "flex", color: "#C8CEDC", position: "relative", overflow: "hidden" }}>
      <style>{globalCSS}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />

      {/* History Sidebar */}
      {showHistory && (
        <div style={{ width: 280, flexShrink: 0, background: "#0D1220", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", position: "relative", zIndex: 2, height: "100vh" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF8" }}>📊 Usage History</div>
            <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: "rgba(140,158,196,0.5)", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {loadingHistory && (
              <div style={{ textAlign: "center", padding: 20, color: "rgba(140,158,196,0.4)", fontSize: 12 }}>Loading...</div>
            )}
            {!loadingHistory && history.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "rgba(140,158,196,0.35)", fontSize: 12 }}>No history yet — start chatting!</div>
            )}
            {history.map((item) => (
              <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "all 0.15s" }}
                onClick={() => {
                  setMessages([
                    { role: "user", content: item.userText, time: "" },
                    { role: "assistant", content: item.aiReply, time: "" },
                  ]);
                  setShowHistory(false);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, background: "rgba(74,144,217,0.15)", color: "#4A90D9", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(74,144,217,0.2)" }}>{item.tool}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }} style={{ background: "none", border: "none", color: "rgba(220,80,80,0.5)", cursor: "pointer", fontSize: 12, padding: 0 }}>🗑</button>
                </div>
                <div style={{ fontSize: 12, color: "#A0AABF", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.userText}</div>
                <div style={{ fontSize: 10, color: "rgba(140,158,196,0.35)" }}>{formatDate(item.createdAt)}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "rgba(140,158,196,0.3)", textAlign: "center" }}>
            {history.length} conversations saved
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <div style={{ maxWidth: 920, width: "100%", margin: "0 auto", padding: "0 18px", display: "flex", flexDirection: "column", height: "100vh" }}>

          {/* Header */}
          <div style={{ padding: "16px 0 12px", borderBottom: "1px solid rgba(255,255,255,0.065)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#142444,#1e3d72)", border: "1px solid rgba(74,144,217,0.38)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 20px rgba(74,144,217,0.18)" }}>◈</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#E8EDF8" }}>WorkWise Enterprise</div>
                <div style={{ fontSize: 9.5, color: "rgba(140,158,196,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>AI Office Intelligence</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* History Button */}
              <button onClick={() => setShowHistory(s => !s)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, background: showHistory ? "rgba(74,144,217,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${showHistory ? "rgba(74,144,217,0.3)" : "rgba(255,255,255,0.09)"}`, color: showHistory ? "#4A90D9" : "rgba(140,158,196,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                📊 History
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ABEBC", boxShadow: "0 0 8px #4ABEBC", animation: "breathe 2.6s ease-in-out infinite" }} />
                <span style={{ fontSize: 10.5, color: "rgba(140,158,196,0.45)", letterSpacing: 0.8 }}>ONLINE</span>
              </div>

              <div style={{ position: "relative" }}>
                <div onClick={() => setShowMenu(s => !s)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: user?.photoURL ? "transparent" : "linear-gradient(135deg,#1E55A0,#2870CC)", border: "1px solid rgba(74,144,217,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                    {user?.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#C8D5E8", lineHeight: 1.2 }}>{user?.displayName || "User"}</div>
                    <div style={{ fontSize: 10, color: "rgba(140,158,196,0.45)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(140,158,196,0.4)", marginLeft: 2 }}>▾</span>
                </div>

                {showMenu && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px", minWidth: 180, boxShadow: "0 16px 40px rgba(0,0,0,0.5)", zIndex: 100 }}>
                    <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#C8D5E8" }}>{user?.displayName || "User"}</div>
                      <div style={{ fontSize: 11, color: "rgba(140,158,196,0.5)", marginTop: 2 }}>{user?.email}</div>
                    </div>
                    <button onClick={() => { setShowMenu(false); logoutUser(); }} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "rgba(220,80,80,0.08)", border: "1px solid rgba(220,80,80,0.18)", color: "#F08080", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⎋</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0 7px", flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: "rgba(140,158,196,0.4)", letterSpacing: 1.2, textTransform: "uppercase" }}>Tone</span>
            <select value={tone} onChange={e => setTone(e.target.value)} style={selectStyle}>
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 10.5, color: "rgba(140,158,196,0.4)", letterSpacing: 1.2, textTransform: "uppercase", marginLeft: 4 }}>Language</span>
            <select value={lang} onChange={e => setLang(e.target.value)} style={selectStyle}>
              {LANGS.map(l => <option key={l}>{l}</option>)}
            </select>
            {docName && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(91,173,143,0.09)", border: "1px solid rgba(91,173,143,0.25)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#5BAD8F" }}>
                📎 {docName.length > 20 ? docName.slice(0, 18) + "…" : docName}
                <span style={{ cursor: "pointer", opacity: 0.55 }} onClick={() => { setDocText(""); setDocName(""); }}>✕</span>
              </div>
            )}
          </div>

          {/* Tools */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, paddingBottom: 9, flexShrink: 0 }}>
            {TOOLS.map(t => {
              const active = activeTool?.id === t.id;
              return (
                <div key={t.id} className="tool-card" onClick={() => handleTool(t)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, cursor: "pointer", background: active ? `${t.color}16` : "rgba(255,255,255,0.025)", border: `1px solid ${active ? t.color + "4A" : "rgba(255,255,255,0.065)"}`, transition: "all 0.17s", userSelect: "none" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: `${t.color}16`, border: `1px solid ${t.color}38`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: t.color }}>{t.icon}</div>
                  <span style={{ fontSize: 11, color: active ? "#D8E4F8" : "#7A8BA8", fontWeight: active ? 600 : 400, lineHeight: 1.25 }}>{t.label}</span>
                </div>
              );
            })}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 8px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((msg, i) => {
              if (msg.role === "notice") return (
                <div key={i} style={{ alignSelf: "center", background: "rgba(91,173,143,0.07)", border: "1px solid rgba(91,173,143,0.2)", borderRadius: 10, padding: "7px 18px", fontSize: 11.5, color: "#5BAD8F" }}>📎 {msg.content}</div>
              );
              const isUser = msg.role === "user";
              return (
                <div key={i} className="msg-fade" style={{ display: "flex", gap: 10, justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-start" }}>
                  {!isUser && <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#0e2038,#1a3760)", border: "1px solid rgba(74,144,217,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginTop: 2 }}>◈</div>}
                  <div style={{ maxWidth: "74%" }}>
                    <div style={{ padding: "11px 15px", borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: isUser ? "linear-gradient(135deg,rgba(22,50,90,0.92),rgba(30,72,130,0.75))" : "rgba(255,255,255,0.033)", border: `1px solid ${isUser ? "rgba(74,144,217,0.22)" : "rgba(255,255,255,0.07)"}`, fontSize: 13.5, lineHeight: 1.72, color: isUser ? "#C0D4EF" : "#B8C4DC" }}>
                      {parseContent(msg.content)}
                      {!isUser && (
                        <button className="copy-btn" onClick={() => copyMsg(msg.content, i)} style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 11, color: copied === i ? "#5BAD8F" : "rgba(140,155,185,0.55)", cursor: "pointer" }}>
                          {copied === i ? "✓ Copied" : "⎘ Copy"}
                        </button>
                      )}
                    </div>
                    {msg.time && <div style={{ fontSize: 10, color: "rgba(140,155,185,0.25)", marginTop: 3, textAlign: isUser ? "right" : "left" }}>{msg.time}</div>}
                  </div>
                  {isUser && (
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: user?.photoURL ? "transparent" : "rgba(74,144,217,0.14)", border: "1px solid rgba(74,144,217,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, overflow: "hidden", marginTop: 2 }}>
                      {user?.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="msg-fade" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#0e2038,#1a3760)", border: "1px solid rgba(74,144,217,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>◈</div>
                <div style={{ padding: "12px 16px", borderRadius: "4px 14px 14px 14px", background: "rgba(255,255,255,0.033)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4A90D9", animation: "bounce 1.1s ease-in-out infinite", animationDelay: `${d * 0.18}s` }} />)}
                    <span style={{ fontSize: 11, color: "rgba(140,155,185,0.35)", marginLeft: 8 }}>Processing…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ flexShrink: 0, padding: "9px 0 16px", borderTop: "1px solid rgba(255,255,255,0.065)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "rgba(255,255,255,0.032)", border: `1px solid ${focused ? "rgba(74,144,217,0.38)" : "rgba(255,255,255,0.09)"}`, borderRadius: 14, padding: "9px 9px 9px 13px", boxShadow: focused ? "0 0 0 3px rgba(74,144,217,0.07)" : "none", transition: "all 0.2s" }}>
              <button onClick={() => fileRef.current.click()} title="Upload document" style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: docName ? "rgba(91,173,143,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${docName ? "rgba(91,173,143,0.3)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer", color: docName ? "#5BAD8F" : "#5A6A85" }}>📎</button>
              <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.html" style={{ display: "none" }} onChange={handleFile} />
              <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={activeTool ? `${activeTool.label}: describe your request…` : "Type your request, paste content, or select a task above…"} rows={1} style={{ flex: 1, resize: "none", background: "transparent", border: "none", outline: "none", color: "#C8CEDC", fontSize: 13.5, lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif", paddingTop: 3, overflowY: "hidden" }} onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }} />
              {input && <button onClick={() => { setInput(""); setActiveTool(null); }} style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer", color: "#5A6A85" }}>✕</button>}
              <button onClick={send} disabled={loading || !input.trim()} className="send-btn" style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: input.trim() && !loading ? "linear-gradient(135deg,#1a55A0,#2870CC)" : "rgba(255,255,255,0.04)", border: `1px solid ${input.trim() && !loading ? "rgba(74,144,217,0.48)" : "rgba(255,255,255,0.07)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: input.trim() && !loading ? "pointer" : "default", boxShadow: input.trim() && !loading ? "0 0 16px rgba(74,144,217,0.25)" : "none", color: "#fff", transition: "all 0.18s" }}>➤</button>
            </div>
            <div style={{ textAlign: "center", fontSize: 10.5, color: "rgba(140,155,185,0.22)", marginTop: 7 }}>
              Enter to send · Shift+Enter for new line · Upload .txt .md .csv .json .html
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const selectStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#A8B4CC", fontSize: 12, padding: "5px 10px", cursor: "pointer", outline: "none", fontFamily: "'DM Sans',sans-serif" };

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080C15; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(74,144,217,0.18); border-radius: 4px; }
  select option { background: #131928; color: #C8CEDC; }
  textarea::placeholder { color: rgba(140,155,185,0.28); }
  @keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.72)} }
  @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.45} 30%{transform:translateY(-5px);opacity:1} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .msg-fade { animation: fadeIn .22s ease both; }
  .tool-card:hover { background: rgba(255,255,255,0.05) !important; transform: translateY(-1px); }
  .copy-btn:hover { color: #C8D8F5 !important; background: rgba(255,255,255,0.07) !important; }
  .send-btn:hover:not(:disabled) { filter: brightness(1.14); transform: scale(1.04); }
`;