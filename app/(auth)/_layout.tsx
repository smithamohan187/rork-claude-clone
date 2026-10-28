// Auth group — sign-in and sign-up stack
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const router = useRouter();
  const { authLoading, isAuthenticated } = useAuth();

  // An already-authenticated user can land here via a direct URL (web) or back-navigation —
  // without this gate, /sign-in and /sign-up render their full forms instead of bouncing the
  // user back to the app, mirroring the inverse guard in checkout-success.tsx.
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/(tabs)/feed' as never);
    }
  }, [authLoading, isAuthenticated, router]);

  // While session restore is in flight, or once we know the user is authenticated and the
  // redirect above is about to fire, show nothing rather than flashing the sign-in/sign-up form.
  if (authLoading || isAuthenticated) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
