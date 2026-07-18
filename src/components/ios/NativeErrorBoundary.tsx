import React from "react";

import { NativeErrorState } from "@/src/components/ios/NativeErrorState";
import { userMessageForError } from "@/src/services/errors";
import { captureTelemetryException } from "@/src/services/telemetry";

type State = { error: unknown };

export class NativeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    captureTelemetryException(error, "ios_native_render_error", {});
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = userMessageForError(this.state.error);
    return (
      <NativeErrorState
        message={`${message.body} ${message.recovery}`}
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}
