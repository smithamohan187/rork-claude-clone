import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { resolveShareReferral } from '@/api/services/sharesService';
import { parseReferralFromUrl, setPendingShareReferral } from '@/utils/shareReferral';

// Handles inbound content-share deep links (expo-linking). Mounted once at the app root.
//
// - App already installed & logged in  -> resolve the code and navigate straight to the detail screen.
// - First launch / not yet registered  -> stash the referral, then route to sign-up. After signup,
//   useSignUp submits the code and redirects to the stashed detail route (see utils/shareReferral).
//
// There is no pre-existing deep-link listener in the app, so this is the single source of truth.
export function useShareDeepLink(): void {
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();
  const handledUrls = useRef<Set<string>>(new Set());
  const pendingUrl = useRef<string | null>(null);

  const handleUrl = async (url: string | null) => {
    if (!url || handledUrls.current.has(url)) return;
    const code = parseReferralFromUrl(url);
    if (!code) return;

    // Auth state not resolved yet — defer until it is (see the authLoading effect below).
    if (authLoading) {
      pendingUrl.current = url;
      return;
    }
    handledUrls.current.add(url);

    const resolved = await resolveShareReferral(code);
    if (!resolved) return; // invalid/expired code — silently ignore.

    if (isAuthenticated) {
      router.push({
        pathname: resolved.route as never,
        params: { [resolved.id_param]: resolved.content_id, businessId: resolved.business_id } as never,
      });
    } else {
      await setPendingShareReferral({
        referral_code: code,
        content_type: resolved.content_type,
        route: resolved.route,
        id_param: resolved.id_param,
        content_id: resolved.content_id,
        business_id: resolved.business_id,
      });
      router.push('/(auth)/sign-up' as never);
    }
  };

  // Initial (cold-start) URL + live listener.
  useEffect(() => {
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => void handleUrl(url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  // Flush a URL that arrived before auth finished resolving.
  useEffect(() => {
    if (!authLoading && pendingUrl.current) {
      const url = pendingUrl.current;
      pendingUrl.current = null;
      void handleUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);
}
