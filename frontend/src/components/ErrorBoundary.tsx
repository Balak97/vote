import { Component, ReactNode } from "react";
import { getErrorMessage } from "../utils/errors";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: getErrorMessage(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ margin: "2rem auto", maxWidth: 560 }}>
          <h2>Une erreur est survenue</h2>
          <p className="alert alert--error">{this.state.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
