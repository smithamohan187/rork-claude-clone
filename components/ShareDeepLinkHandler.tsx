import { useShareDeepLink } from '@/hooks/useShareDeepLink';

// Headless component: mounts the content-share deep-link listener once at the app root.
// Must live inside AuthProvider (uses auth state) and the router tree (uses useRouter).
export default function ShareDeepLinkHandler(): null {
  useShareDeepLink();
  return null;
}
