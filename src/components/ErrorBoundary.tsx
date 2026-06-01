import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Primitives';
import { palette, spacing,
typography,
} from '@/src/constants/design';
import { userMessageForError } from '@/src/services/errors';
import { captureTelemetryException } from '@/src/services/telemetry';

type State = {
  error: unknown;
};

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    captureTelemetryException(error, 'render_error_boundary', { screen: 'root_layout' });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    const message = userMessageForError(this.state.error);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.body}>{message.body}</Text>
        <Text style={styles.body}>{message.recovery}</Text>
        <Button title="Try again" icon="refresh" onPress={() => this.setState({ error: null })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: palette.ink,
    fontSize: typography.size.h2,
    fontWeight: '900',
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
  },
});
