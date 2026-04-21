// src/App.js
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import AgentPage from "./pages/AgentPage";

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080C15", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#142444,#1e3d72)", border: "1px solid rgba(74,144,217,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, margin: "0 auto 16px", boxShadow: "0 0 20px rgba(74,144,217,0.2)" }}>◈</div>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(74,144,217,0.3)", borderTopColor: "#4A90D9", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return user ? <AgentPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
