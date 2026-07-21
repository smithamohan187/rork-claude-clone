import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getDeviceContacts, DeviceContact } from '@/api/services/contactsService';
import {
  pickCsvFile,
  parseCsvText,
  validateCsvRows,
  CsvPreviewRow,
} from '@/api/services/fileParseService';
import {
  createCustomerInvite,
  bulkCreateCustomerInvites,
  CustomerInviteChannel,
} from '@/api/services/customerInviteService';
import { sendInviteEmail } from '@/api/services/mailComposerService';
import { useContactsPermission } from '@/hooks/useContactsPermission';
import { useSnackbar } from '@/contexts/SnackbarContext';

export type InviteTabKey = 'contacts' | 'email' | 'manual' | 'csv';

export type EmailRow = { id: string; name: string; email: string };
export type ManualRow = { id: string; name: string; phone: string; email: string };

const isValidEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isValidPhone = (s: string): boolean => {
  const stripped = s.trim().replace(/[\s\-().]/g, '');
  return /^\+?[1-9]\d{6,14}$/.test(stripped);
};

export interface SendResultRow {
  name: string;
  channel: CustomerInviteChannel;
  status: 'sent' | 'duplicate' | 'error';
  message?: string;
}

export function useInviteCustomers(businessId: string, businessName: string) {
  const { showSnackbar } = useSnackbar();
  const contactsPermission = useContactsPermission();

  const [activeTab, setActiveTab] = useState<InviteTabKey>('contacts');

  // Contacts tab
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(false);
  const [contactSearch, setContactSearch] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<Record<string, boolean>>({});
  const [contactPhoneIdx, setContactPhoneIdx] = useState<Record<string, number>>({});

  // Email tab
  const [emailRows, setEmailRows] = useState<EmailRow[]>([{ id: 'e1', name: '', email: '' }]);

  // Manual tab
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: 'm1', name: '', phone: '', email: '' },
  ]);

  // CSV tab
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastResults, setLastResults] = useState<SendResultRow[] | null>(null);

  const importContacts = useCallback(async () => {
    const status = await contactsPermission.request();
    if (status !== 'granted') return;
    setContactsLoading(true);
    try {
      const contacts = await getDeviceContacts();
      setDeviceContacts(contacts);
    } finally {
      setContactsLoading(false);
    }
  }, [contactsPermission]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setLastResults(null);
      };
    }, []),
  );

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return deviceContacts;
    return deviceContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phones.some((p) => p.toLowerCase().includes(q)),
    );
  }, [contactSearch, deviceContacts]);

  const toggleContact = useCallback((id: string) => {
    setSelectedContactIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const allContactsSelected = useMemo(
    () => filteredContacts.length > 0 && filteredContacts.every((c) => selectedContactIds[c.id]),
    [filteredContacts, selectedContactIds],
  );

  const toggleSelectAllContacts = useCallback(() => {
    setSelectedContactIds((prev) => {
      const next = { ...prev };
      filteredContacts.forEach((c) => {
        next[c.id] = !allContactsSelected;
      });
      return next;
    });
  }, [allContactsSelected, filteredContacts]);

  const selectedContacts = useMemo(
    () => deviceContacts.filter((c) => selectedContactIds[c.id]),
    [deviceContacts, selectedContactIds],
  );

  // Email tab handlers
  const addEmailRow = useCallback(() => {
    setEmailRows((prev) => (prev.length >= 20 ? prev : [...prev, { id: `e${Date.now()}`, name: '', email: '' }]));
  }, []);
  const removeEmailRow = useCallback((id: string) => {
    setEmailRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);
  const updateEmailRow = useCallback((id: string, key: 'name' | 'email', value: string) => {
    setEmailRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  const validEmailRows = useMemo(
    () => emailRows.filter((r) => isValidEmail(r.email)),
    [emailRows],
  );

  // Manual tab handlers
  const addManualRow = useCallback(() => {
    setManualRows((prev) =>
      prev.length >= 20 ? prev : [...prev, { id: `m${Date.now()}`, name: '', phone: '', email: '' }],
    );
  }, []);
  const removeManualRow = useCallback((id: string) => {
    setManualRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);
  const updateManualRow = useCallback((id: string, key: 'name' | 'phone' | 'email', value: string) => {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  const validManualRows = useMemo(
    () =>
      manualRows.filter((r) => {
        const hasPhone = r.phone.trim().length > 0 && isValidPhone(r.phone);
        const hasEmail = r.email.trim().length > 0 && isValidEmail(r.email);
        return hasPhone || hasEmail;
      }),
    [manualRows],
  );

  // CSV tab handlers
  const pickAndParseCsv = useCallback(async () => {
    setCsvError(null);
    const picked = await pickCsvFile();
    if (!picked) return;
    const { rows, headerError } = parseCsvText(picked.text);
    if (headerError) {
      setCsvError(headerError);
      setCsvPreviewRows([]);
      setCsvFileName(picked.fileName);
      return;
    }
    setCsvFileName(picked.fileName);
    setCsvPreviewRows(validateCsvRows(rows));
  }, []);

  const csvValidRows = useMemo(() => csvPreviewRows.filter((r) => r.status === 'valid'), [csvPreviewRows]);

  const totalCount =
    selectedContacts.length + validEmailRows.length + validManualRows.length + csvValidRows.length;

  const submit = useCallback(async () => {
    if (totalCount === 0) return;
    setIsSubmitting(true);
    const results: SendResultRow[] = [];

    try {
      for (const contact of selectedContacts) {
        const idx = contactPhoneIdx[contact.id] ?? 0;
        const phone = contact.phones[idx] ?? contact.phones[0];
        const email = phone ? undefined : contact.emails[0];
        try {
          const res = await createCustomerInvite({
            business_id: businessId,
            channel: 'contact',
            name: contact.name,
            phone,
            email,
          });
          results.push({
            name: contact.name,
            channel: 'contact',
            status: res.duplicate ? 'duplicate' : 'sent',
          });
        } catch (err) {
          results.push({
            name: contact.name,
            channel: 'contact',
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to send',
          });
        }
      }

      // Nothing sends real email server-side — open the device's mail app (or copy to clipboard
      // as a last resort) so the user can actually deliver the invite, same pattern as
      // app/business-invite-email.tsx. Each recipient gets their OWN dispatch with their OWN
      // invite link — a shared/batched email would carry only one recipient's code, which
      // silently sends everyone else the wrong referral link.
      const subject = `Join ${businessName} on TouchPoints!`;
      let mailtoCount = 0;
      let clipboardCount = 0;

      for (const row of validEmailRows) {
        try {
          const res = await createCustomerInvite({
            business_id: businessId,
            channel: 'email',
            name: row.name || row.email,
            email: row.email,
          });
          results.push({
            name: row.name || row.email,
            channel: 'email',
            status: res.duplicate ? 'duplicate' : 'sent',
          });
          if (res.invite) {
            const body = `You're invited to join ${businessName} on TouchPoints! Subscribe to earn points and unlock rewards.\n\n${res.invite.url}`;
            const dispatchResult = await sendInviteEmail({ recipients: [row.email], subject, body });
            if (dispatchResult === 'mailto') mailtoCount += 1;
            else if (dispatchResult === 'clipboard') clipboardCount += 1;
          }
        } catch (err) {
          results.push({
            name: row.name || row.email,
            channel: 'email',
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to send',
          });
        }
      }

      let emailDispatchNote = '';
      if (mailtoCount > 0 || clipboardCount > 0) {
        const parts: string[] = [];
        if (mailtoCount > 0) parts.push(`${mailtoCount} mail session${mailtoCount === 1 ? '' : 's'} opened`);
        if (clipboardCount > 0) parts.push(`${clipboardCount} copied to clipboard (no mail app)`);
        emailDispatchNote = ` ${parts.join(', ')} — check your mail app to deliver.`;
      }

      for (const row of validManualRows) {
        const label = row.name || row.phone || row.email;
        try {
          const res = await createCustomerInvite({
            business_id: businessId,
            channel: 'manual',
            name: row.name,
            phone: row.phone || undefined,
            email: row.email || undefined,
          });
          results.push({ name: label, channel: 'manual', status: res.duplicate ? 'duplicate' : 'sent' });
        } catch (err) {
          results.push({
            name: label,
            channel: 'manual',
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to send',
          });
        }
      }

      if (csvValidRows.length > 0) {
        try {
          const bulkResult = await bulkCreateCustomerInvites({
            business_id: businessId,
            rows: csvValidRows.map((r) => ({ name: r.name, email: r.email || undefined, phone: r.phone || undefined })),
          });
          bulkResult.results.forEach((r) => {
            results.push({
              name: r.name || r.email || r.phone || 'CSV row',
              channel: 'csv',
              status: r.status === 'inserted' ? 'sent' : r.status === 'already-invited' ? 'duplicate' : 'error',
              message: r.reason,
            });
          });
        } catch (err) {
          results.push({
            name: 'CSV upload',
            channel: 'csv',
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to send bulk invites',
          });
        }
      }

      setLastResults(results);
      const sentCount = results.filter((r) => r.status === 'sent').length;
      showSnackbar(
        (sentCount === results.length
          ? `${sentCount} invite${sentCount === 1 ? '' : 's'} sent!`
          : `${sentCount} of ${results.length} invites sent — some were duplicates or failed.`
        ) + emailDispatchNote,
      );

      if (sentCount > 0) {
        setSelectedContactIds({});
        setContactPhoneIdx({});
        setEmailRows([{ id: 'e1', name: '', email: '' }]);
        setManualRows([{ id: 'm1', name: '', phone: '', email: '' }]);
        setCsvFileName('');
        setCsvPreviewRows([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    totalCount,
    selectedContacts,
    contactPhoneIdx,
    validEmailRows,
    validManualRows,
    csvValidRows,
    businessId,
    businessName,
    showSnackbar,
  ]);

  return {
    activeTab,
    setActiveTab,

    contactsPermission,
    importContacts,
    contactsLoading,
    filteredContacts,
    contactSearch,
    setContactSearch,
    selectedContactIds,
    toggleContact,
    allContactsSelected,
    toggleSelectAllContacts,
    contactPhoneIdx,
    setContactPhoneIdx,
    selectedContactsCount: selectedContacts.length,

    emailRows,
    addEmailRow,
    removeEmailRow,
    updateEmailRow,
    validEmailCount: validEmailRows.length,

    manualRows,
    addManualRow,
    removeManualRow,
    updateManualRow,
    validManualCount: validManualRows.length,

    csvFileName,
    csvPreviewRows,
    csvError,
    pickAndParseCsv,
    csvValidCount: csvValidRows.length,

    totalCount,
    isSubmitting,
    lastResults,
    submit,
  };
}
