// Service layer — wraps mailto: / clipboard for dispatching invite emails.
// Screens/hooks never touch Linking or Clipboard directly.
// No expo-mail-composer here: Metro resolves import() specifiers at bundle time, so referencing an
// uninstalled package — even behind a runtime try/catch — breaks the whole app bundle, not just
// this feature.
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type MailDispatchResult = 'mailto' | 'clipboard' | 'failed';

export async function sendInviteEmail({
  recipients,
  subject,
  body,
}: {
  recipients: string[];
  subject: string;
  body: string;
}): Promise<MailDispatchResult> {
  if (recipients.length === 0) return 'failed';

  const url = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const supported = await Linking.canOpenURL(url).catch(() => false);
  if (supported) {
    try {
      await Linking.openURL(url);
      return 'mailto';
    } catch {
      // fall through to clipboard
    }
  }

  try {
    await Clipboard.setStringAsync(`${subject}\n\n${body}`);
    return 'clipboard';
  } catch {
    return 'failed';
  }
}
