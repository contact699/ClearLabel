import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { COLORS } from '@/lib/constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#FEE2E2',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <AlertTriangle size={40} color={COLORS.alertRed} />
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#1E293B',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Oops! Something went wrong
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: '#64748B',
                marginBottom: 24,
                textAlign: 'center',
                lineHeight: 24,
              }}
            >
              Don't worry, we've logged the error. Try restarting the app or contact support if this persists.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView
                style={{
                  maxHeight: 200,
                  width: '100%',
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Text>
              </ScrollView>
            )}

            <Pressable
              onPress={this.handleReset}
              style={{
                backgroundColor: COLORS.brandGreen,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#0D9488',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <RefreshCw size={20} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  marginLeft: 8,
                }}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
