import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class FeedPreviewBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Something went wrong',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.log('[FeedPreviewBoundary] caught error:', error?.message, info?.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const isNetwork = /Failed to fetch|NetworkError|Network request failed|fetch failed/i.test(
        this.state.errorMessage,
      );
      return (
        <View style={styles.container} testID="feed-preview-error">
          <View style={styles.iconWrap}>
            <AlertCircle size={36} color="#00B246" />
          </View>
          <Text style={styles.title}>
            {isNetwork ? 'Connection issue' : 'Preview unavailable'}
          </Text>
          <Text style={styles.subtitle}>
            {isNetwork
              ? 'We could not load this feed preview. Please check your internet connection and try again.'
              : 'This feed preview could not be displayed right now.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={this.handleRetry}
            activeOpacity={0.85}
            testID="feed-preview-retry"
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECEEF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D2E',
    letterSpacing: -0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#5C5F72',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00B246',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
