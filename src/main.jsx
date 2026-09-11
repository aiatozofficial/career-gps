import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Fatal Crash Caught:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c1524",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: "20px",
          textAlign: "center"
        }}>
          <span style={{ fontSize: "50px" }}>🚨</span>
          <h1 style={{ marginTop: "20px", fontSize: "24px", fontWeight: "bold" }}>Career GPS Encountered a Fatal Error</h1>
          <p style={{ marginTop: "10px", color: "#94a3b8", maxWidth: "450px", fontSize: "14px", lineHeight: "1.6" }}>
            This usually happens when old, incompatible local storage data from previous versions is loaded. Click below to clear all storage and reset the app.
          </p>
          <pre style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#1e293b",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#fda4af",
            maxWidth: "90%",
            overflowX: "auto",
            border: "1px solid rgba(244, 63, 94, 0.2)"
          }}>
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: "30px",
              padding: "12px 24px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              transition: "transform 0.1s"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Clear Stored Data & Reset App 🚀
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
