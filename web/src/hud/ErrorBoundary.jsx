import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="notice" role="alert">
        <h2>Something went wrong</h2>
        <p>{String(this.state.error.message || this.state.error)}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          New game
        </button>
      </div>
    );
  }
}
