import { useCallback, useEffect, useMemo, useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { getDeviceContacts, DeviceContact } from '@/api/services/contactsService';
import { getMyReferral, MyReferral } from '@/api/services/referralService';
import { sendInviteSms } from '@/api/services/smsComposerService';
import { sendInviteEmail } from '@/api/services/mailComposerService';
import { useContactsPermission } from '@/hooks/useContactsPermission';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';

export function useInviteFriends() {
  const { showSnackbar } = useSnackbar();
  const contactsPermission = useContactsPermission();
  const { authLoading, isAuthenticated } = useAuth();

  const [referral, setReferral] = useState<MyReferral | null>(null);
  const [referralLoading, setReferralLoading] = useState<boolean>(true);

  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(false);
  const [contactsSearch, setContactsSearch] = useState<string>('');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyReferral();
        if (!cancelled) setReferral(data);
      } catch (err) {
        if (__DEV__) console.log('[useInviteFriends] getMyReferral failed', err);
      } finally {
        if (!cancelled) setReferralLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const importContacts = useCallback(async () => {
    try {
      const status = await contactsPermission.request();
      if (status !== 'granted') return;
      setContactsLoading(true);
      try {
        const contacts = await getDeviceContacts();
        setDeviceContacts(contacts);
      } finally {
        setContactsLoading(false);
      }
    } catch (err) {
      // contactsService already catches native failures internally — this is a last-resort guard
      // so nothing from this user action can ever propagate uncaught and crash the app.
      if (__DEV__) console.log('[useInviteFriends] importContacts error', err);
      showSnackbar("Couldn't access contacts. Please try again.");
    }
  }, [contactsPermission, showSnackbar]);

  useFocusEffect(
    useCallback(() => {
      // no-op refresh hook reserved for parity with other invite screens
      return () => {};
    }, []),
  );

  const filteredContacts = useMemo(() => {
    const q = contactsSearch.trim().toLowerCase();
    if (!q) return deviceContacts;
    return deviceContacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phones.some((p) => p.toLowerCase().includes(q)) ||
      c.emails.some((e) => e.toLowerCase().includes(q)),
    );
  }, [deviceContacts, contactsSearch]);

  const shareMessage = useCallback(
    (url: string) => `Join me on TouchPoints! ${url}`,
    [],
  );

  const inviteMessage = useCallback(
    (url: string) =>
      `Come join TouchPoints! Check out offers and events from businesses of your interest: ${url}`,
    [],
  );

  const shareLink = useCallback(async () => {
    if (!referral) return;
    try {
      await Share.share({ message: shareMessage(referral.url) });
    } catch (err) {
      if (__DEV__) console.log('[useInviteFriends] shareLink error', err);
    }
  }, [referral, shareMessage]);

  // Targets the tapped contact directly — SMS to their phone if they have one, otherwise email,
  // otherwise the generic share sheet (unreachable in practice since getDeviceContacts() already
  // filters out contacts with neither, kept only so this function is total).
  const shareToContact = useCallback(
    async (contact: DeviceContact) => {
      if (!referral) return;
      const message = inviteMessage(referral.url);
      try {
        const phone = contact.phones[0];
        if (phone) {
          const result = await sendInviteSms({ phone, message });
          if (result === 'sms') {
            showSnackbar(`Invite sent to ${contact.name}`);
          } else if (result === 'clipboard') {
            showSnackbar('Message copied to clipboard — paste it to send');
          } else {
            showSnackbar("Couldn't send the invite. Please try again.");
          }
          return;
        }

        const email = contact.emails[0];
        if (email) {
          const result = await sendInviteEmail({ recipients: [email], subject: 'Join me on TouchPoints', body: message });
          if (result === 'mailto') {
            showSnackbar(`Invite sent to ${contact.name}`);
          } else if (result === 'clipboard') {
            showSnackbar('Message copied to clipboard — paste it to send');
          } else {
            showSnackbar("Couldn't send the invite. Please try again.");
          }
          return;
        }

        await Share.share({ message });
      } catch (err) {
        // Nothing from this user action should ever propagate uncaught.
        if (__DEV__) console.log('[useInviteFriends] shareToContact error', err);
        showSnackbar("Couldn't send the invite. Please try again.");
      }
    },
    [referral, inviteMessage, showSnackbar],
  );

  const copyLink = useCallback(async () => {
    if (!referral) return;
    try {
      await Clipboard.setStringAsync(referral.url);
      showSnackbar('Referral link copied to clipboard');
    } catch (err) {
      if (__DEV__) console.log('[useInviteFriends] copyLink error', err);
    }
  }, [referral, showSnackbar]);

  return {
    referral,
    referralLoading,

    contactsPermission,
    importContacts,
    contactsLoading,
    deviceContacts,
    filteredContacts,
    contactsSearch,
    setContactsSearch,

    shareLink,
    shareToContact,
    copyLink,
  };
}
