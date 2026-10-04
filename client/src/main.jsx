import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("TwinCam Application Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px 20px", maxWidth: 640, margin: "40px auto", background: "#161b22", border: "1px solid #30363d", borderRadius: 12, color: "#f1f5f9", fontFamily: "monospace" }}>
          <h2 style={{ color: "#f43f5e", marginTop: 0 }}>⚠️ Terjadi Kesalahan Memuat Aplikasi</h2>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            Detail error:
          </p>
          <pre style={{ background: "#0d1117", padding: 16, borderRadius: 8, color: "#fb7185", fontSize: 13, overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "10px 20px", background: "#f43f5e", color: "white", border: 0, borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
