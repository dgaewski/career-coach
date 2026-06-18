import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="empty" style={{ padding: "60px 0", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600 }}>Something went wrong</h2>
          <p className="muted" style={{ fontSize: 13 }}>{this.state.error.message}</p>
          <p className="muted" style={{ fontSize: 13 }}>
            Try the <a href="/" style={{ color: "var(--accent)" }}>Overview</a> or reload the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
