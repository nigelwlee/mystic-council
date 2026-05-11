import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.log(JSON.stringify({ event: 'global_error', err: err.message, stack: err.stack, componentStack: info.componentStack }));
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.detail}>{this.state.message}</Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#F5F0E8', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  detail: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  button: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(191,168,130,0.4)' },
  buttonText: { color: 'rgba(191,168,130,1)', fontSize: 14 },
});
