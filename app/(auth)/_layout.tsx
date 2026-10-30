// Auth group — sign-in and sign-up stack
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const router = useRouter();
  const { authLoading, isAuthenticated, holdAuthRedirectRef } = useAuth();

  // An already-authenticated user can land here via a direct URL (web) or back-navigation —
  // without this gate, /sign-in and /sign-up render their full forms instead of bouncing the
  // user back to the app, mirroring the inverse guard in checkout-success.tsx.
  // `holdAuthRedirectRef` lets sign-up suppress this immediately after its own loginWithTokens
  // call (isAuthenticated flips true right away) so it can show its success Snackbar and perform
  // its own content-aware redirect once the user dismisses it, instead of this guard unmounting
  // the sign-up screen out from under it first. It's a ref (read once, here, when the effect
  // actually fires) rather than reactive state deliberately — releasing the hold afterwards must
  // NOT be a dependency change that re-runs this effect, or it would fire router.replace('/feed')
  // a second time and race sign-up's own content-aware redirect.
  useEffect(() => {
    if (!authLoading && isAuthenticated && !holdAuthRedirectRef.current) {
      router.replace('/(tabs)/feed' as never);
    }
  }, [authLoading, isAuthenticated, router]);

  // While session restore is in flight, or once we know the user is authenticated and the
  // redirect above is about to fire, show nothing rather than flashing the sign-in/sign-up form.
  if (authLoading || (isAuthenticated && !holdAuthRedirectRef.current)) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
