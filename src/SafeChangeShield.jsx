import React from "react";

export class SafeChangeShield extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("WorkForce screen failed safely.", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || "A screen change caused the app to stop rendering.";
    return (
      <main className="safe-change-crash-screen" role="alert">
        <section>
          <div className="safe-change-crash-mark">!</div>
          <p className="eyebrow">Screen protected</p>
          <h1>This change needs review</h1>
          <p>
            The app caught a screen error before showing a blank page. Use Safe Change Preview to test the change,
            then run the safety checks before making it part of the main app.
          </p>
          <pre>{message}</pre>
          <div className="safe-change-crash-actions">
            <button type="button" onClick={() => window.location.reload()}>Reload App</button>
            <a href="/?preview=safe-change&role=owner&section=owner-dashboard">Open Safe Preview</a>
          </div>
        </section>
      </main>
    );
  }
}
