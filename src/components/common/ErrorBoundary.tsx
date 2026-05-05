import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="container flex min-h-[40vh] flex-col items-center justify-center gap-3 py-10 text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.reset} variant="outline">Try again</Button>
            <Button onClick={() => (window.location.href = "/")}>Go home</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}