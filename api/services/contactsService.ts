// Service layer — wraps expo-contacts. Screens/hooks never import expo-contacts directly.
import { Platform } from 'react-native';

export type ContactsPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface DeviceContact {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
}

async function loadContactsModule(): Promise<typeof import('expo-contacts') | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-contacts');
  } catch {
    return null;
  }
}

/** Requests OS contacts permission. Only call this in response to a user action. */
export async function requestContactsPermission(): Promise<ContactsPermissionStatus> {
  const mod = await loadContactsModule();
  if (!mod) return 'denied';
  try {
    const { status } = await mod.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch (e) {
    // A native-level failure here (e.g. the native module isn't actually linked in this build)
    // must never propagate — an uncaught error in this event-handler path crashes the whole app.
    console.log('[contactsService] requestPermissionsAsync failed', e);
    return 'denied';
  }
}

export async function getContactsPermissionStatus(): Promise<ContactsPermissionStatus> {
  const mod = await loadContactsModule();
  if (!mod) return 'denied';
  try {
    const { status } = await mod.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch (e) {
    console.log('[contactsService] getPermissionsAsync failed', e);
    return 'denied';
  }
}

/** Fetches device contacts with at least one phone or email. Assumes permission already granted. */
export async function getDeviceContacts(): Promise<DeviceContact[]> {
  const mod = await loadContactsModule();
  if (!mod) return [];

  try {
    const { data } = await mod.getContactsAsync({
      fields: [mod.Fields.PhoneNumbers, mod.Fields.Emails, mod.Fields.Name],
    });

    return (data ?? [])
      .filter((c) => !!c.name)
      .map((c) => ({
        id: c.id ?? `${c.name}-${c.phoneNumbers?.[0]?.number ?? c.emails?.[0]?.email ?? ''}`,
        name: c.name as string,
        phones: (c.phoneNumbers ?? []).map((p) => p.number).filter((n): n is string => !!n),
        emails: (c.emails ?? []).map((e) => e.email).filter((e): e is string => !!e),
      }))
      .filter((c) => c.phones.length > 0 || c.emails.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.log('[contactsService] getContactsAsync failed', e);
    return [];
  }
}
