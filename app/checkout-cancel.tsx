import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

// Landing page for the web checkout redirect when the user cancels or backs out of Stripe
// Checkout (see hooks/useSubscriptionCheckout.ts). The business itself was already created
// before checkout started — only plan selection is unresolved, so this just sends them back
// to pick again rather than losing any of their entered profile data.
export default function CheckoutCancelScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout cancelled</Text>
      <Text style={styles.subtitle}>No charge was made. You can pick a plan again whenever you're ready.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/create-business-profile' as never)}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Back to Plan Selection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  button: {
    backgroundColor: Colors.navyDark,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
