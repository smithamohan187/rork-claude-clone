// Service layer — wraps sms: / clipboard for dispatching invite texts.
// Screens/hooks never touch Linking or Clipboard directly.
// No expo-sms here: Metro resolves import() specifiers at bundle time, so referencing an
// uninstalled package — even behind a runtime try/catch — breaks the whole app bundle, not just
// this feature. Same reasoning as mailComposerService.ts's mailto: approach.
import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type SmsDispatchResult = 'sms' | 'clipboard' | 'failed';

export async function sendInviteSms({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<SmsDispatchResult> {
  if (!phone) return 'failed';

  const sep = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
  const supported = await Linking.canOpenURL(url).catch(() => false);
  if (supported) {
    try {
      await Linking.openURL(url);
      return 'sms';
    } catch {
      // fall through to clipboard
    }
  }

  try {
    await Clipboard.setStringAsync(message);
    return 'clipboard';
  } catch {
    return 'failed';
  }
}
