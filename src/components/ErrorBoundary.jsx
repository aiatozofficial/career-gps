import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          padding: "2rem",
          background: "radial-gradient(circle at center, #0f2d1e 0%, #050d0a 100%)",
          color: "#fff",
          fontFamily: "'Outfit', 'Inter', system-ui, sans-serif"
        }}>
          <div style={{
            maxWidth: "500px",
            width: "100%",
            background: "rgba(17, 34, 26, 0.65)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "1.5rem"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            
            <h2 style={{ 
              fontSize: "1.5rem", 
              fontWeight: "600",
              color: "#fff", 
              marginBottom: "0.75rem",
              background: "linear-gradient(to right, #ff8a8a, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Roadmap View Error
            </h2>
            
            <p style={{ 
              color: "#a0aec0", 
              marginBottom: "1rem", 
              lineHeight: "1.6",
              fontSize: "0.95rem"
            }}>
              Something went wrong generating your roadmap. Please refresh and try again.
            </p>

            {this.state.error && (
              <pre style={{
                textAlign: "left",
                background: "rgba(0,0,0,0.5)",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                overflow: "auto",
                color: "#ff8a8a",
                width: "100%",
                maxHeight: "200px",
                marginBottom: "2rem",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                whiteSpace: "pre-wrap"
              }}>
                {this.state.error.toString() + "\n" + (this.state.error.stack || "")}
              </pre>
            )}
            
            <button
              onClick={this.handleRetry}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.75rem 2rem",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)";
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
