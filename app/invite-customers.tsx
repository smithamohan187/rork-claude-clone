import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  ChevronUp,
  FileUp,
  Download,
  Send,
  Smartphone,
  AtSign,
  Upload,
  Users,
  Pencil,
} from 'lucide-react-native';
import {
  TextInput as PaperTextInput,
  Button as PaperButton,
  Snackbar,
  Portal,
  Modal,
  Surface,
  Divider,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

const ACCENT = '#00B246';
const ACCENT_LIGHT = '#EDE9F6';
const ACCENT_MUTED = '#E8F5EE';
const BORDER_SOFT = '#E8F5EE';
const SEARCH_BG = '#E8F5EE';
const BADGE_ACCENT = '#FF6B35';
const GREEN = '#0F6E56';
const RED = '#E24B4A';
const MUTED = '#888780';

type TabKey = 'contacts' | 'email' | 'manual' | 'bulk';

type MockContact = {
  id: string;
  name: string;
  phones: string[];
};

const MOCK_CONTACTS: MockContact[] = [
  { id: '1', name: 'Oliver Bennett', phones: ['+44 7911 123456'] },
  { id: '2', name: 'Amelia Clarke', phones: ['+44 7823 234567'] },
  { id: '3', name: 'George Harrison', phones: ['+44 7734 345678'] },
  { id: '4', name: 'Sophie Williams', phones: ['+44 7645 456789'] },
  { id: '5', name: 'Harry Thompson', phones: ['+44 7556 567890'] },
  { id: '6', name: 'Isabella Moore', phones: ['+44 7467 678901'] },
  { id: '7', name: 'Charlie Davies', phones: ['+44 7378 789012'] },
  { id: '8', name: 'Poppy Wilson', phones: ['+44 7289 890123'] },
  { id: '9', name: 'Jack Robinson', phones: ['+44 7190 901234'] },
  { id: '10', name: 'Ella Taylor', phones: ['+44 7912 012345'] },
  { id: '11', name: 'Alfie Johnson', phones: ['+44 7824 123456'] },
  { id: '12', name: 'Millie Anderson', phones: ['+44 7735 234567'] },
];

type EmailRow = { id: string; name: string; email: string };
type PhoneRow = { id: string; name: string; phone: string };

type ParsedRow = {
  name: string;
  email?: string;
  phone?: string;
};

type SkippedRow = {
  rowNumber: number;
  reason: string;
};

type Recipient = {
  name: string;
  email?: string;
  phone?: string;
  channel: 'sms' | 'email';
  source: 'contacts' | 'email' | 'manual' | 'bulk';
};

const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isPhone = (s: string): boolean => {
  const t = s.trim();
  if (!/^[+]?[\d\s\-()]{10,}$/.test(t)) return false;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 10;
};

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
};

export default function InviteCustomersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ businessId?: string; businessName?: string }>();
  const businessId = params.businessId ?? 'demo-business';
  const businessName = params.businessName ?? 'Your Business';
  const referralLink = `https://touchpoint.app/join/${businessId}`;

  const [activeTab, setActiveTab] = useState<TabKey>('contacts');
  const [customMessage, setCustomMessage] = useState<string>('');

  // Contacts tab (phone only)
  const [selectedContacts, setSelectedContacts] = useState<Record<string, boolean>>({});
  const [contactPhoneIdx, setContactPhoneIdx] = useState<Record<string, number>>({});
  const [contactSearch, setContactSearch] = useState<string>('');
  const [phonePickerFor, setPhonePickerFor] = useState<string | null>(null);

  // Email tab
  const [emailRows, setEmailRows] = useState<EmailRow[]>([
    { id: 'e1', name: '', email: '' },
  ]);

  // Manual phone tab
  const [phoneRows, setPhoneRows] = useState<PhoneRow[]>([
    { id: 'p1', name: '', phone: '' },
  ]);

  // Bulk upload tab
  const [bulkText, setBulkText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [formatGuideOpen, setFormatGuideOpen] = useState<boolean>(false);
  const [skippedOpen, setSkippedOpen] = useState<boolean>(false);

  // UI state
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);

  const phoneContacts = useMemo(
    () => MOCK_CONTACTS.filter((c) => c.phones.length > 0),
    [],
  );

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return phoneContacts;
    return phoneContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phones.some((p) => p.toLowerCase().includes(q)),
    );
  }, [contactSearch, phoneContacts]);

  const contactsRecipients = useMemo<Recipient[]>(() => {
    return phoneContacts
      .filter((c) => selectedContacts[c.id])
      .map((c) => ({
        name: c.name,
        phone: c.phones[contactPhoneIdx[c.id] ?? 0],
        channel: 'sms' as const,
        source: 'contacts' as const,
      }));
  }, [phoneContacts, selectedContacts, contactPhoneIdx]);

  const emailRecipients = useMemo<Recipient[]>(() => {
    return emailRows
      .map((r) => {
        const e = r.email.trim();
        if (!isEmail(e)) return null;
        return {
          name: r.name.trim() || e,
          email: e,
          channel: 'email' as const,
          source: 'email' as const,
        } satisfies Recipient;
      })
      .filter((r): r is Recipient => r !== null);
  }, [emailRows]);

  const phoneRecipients = useMemo<Recipient[]>(() => {
    return phoneRows
      .map((r) => {
        const p = r.phone.trim();
        if (!isPhone(p)) return null;
        return {
          name: r.name.trim() || p,
          phone: p,
          channel: 'sms' as const,
          source: 'manual' as const,
        } satisfies Recipient;
      })
      .filter((r): r is Recipient => r !== null);
  }, [phoneRows]);

  const bulkRecipients = useMemo<Recipient[]>(() => {
    return parsedRows.map((r) => {
      // prefer email if present (per spec)
      if (r.email) {
        return {
          name: r.name,
          email: r.email,
          channel: 'email' as const,
          source: 'bulk' as const,
        };
      }
      return {
        name: r.name,
        phone: r.phone,
        channel: 'sms' as const,
        source: 'bulk' as const,
      };
    });
  }, [parsedRows]);

  const allRecipients = useMemo<Recipient[]>(
    () => [...contactsRecipients, ...emailRecipients, ...phoneRecipients, ...bulkRecipients],
    [contactsRecipients, emailRecipients, phoneRecipients, bulkRecipients],
  );

  const smsCount = useMemo(
    () => allRecipients.filter((r) => r.channel === 'sms').length,
    [allRecipients],
  );
  const emailCount = useMemo(
    () => allRecipients.filter((r) => r.channel === 'email').length,
    [allRecipients],
  );
  const totalCount = smsCount + emailCount;

  const bulkSmsCount = useMemo(
    () => bulkRecipients.filter((r) => r.channel === 'sms').length,
    [bulkRecipients],
  );
  const bulkEmailCount = useMemo(
    () => bulkRecipients.filter((r) => r.channel === 'email').length,
    [bulkRecipients],
  );

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const toggleContact = useCallback(
    (id: string) => {
      haptic();
      setSelectedContacts((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [haptic],
  );

  const allSelected = useMemo(
    () => filteredContacts.length > 0 && filteredContacts.every((c) => selectedContacts[c.id]),
    [filteredContacts, selectedContacts],
  );

  const toggleSelectAll = useCallback(() => {
    haptic();
    setSelectedContacts((prev) => {
      const next = { ...prev };
      if (allSelected) {
        filteredContacts.forEach((c) => {
          next[c.id] = false;
        });
      } else {
        filteredContacts.forEach((c) => {
          next[c.id] = true;
        });
      }
      return next;
    });
  }, [allSelected, filteredContacts, haptic]);

  // Email tab handlers
  const addEmailRow = useCallback(() => {
    setEmailRows((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, { id: `e${Date.now()}`, name: '', email: '' }];
    });
  }, []);
  const removeEmailRow = useCallback((id: string) => {
    setEmailRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);
  const updateEmailRow = useCallback((id: string, key: 'name' | 'email', value: string) => {
    setEmailRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  // Phone tab handlers
  const addPhoneRow = useCallback(() => {
    setPhoneRows((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, { id: `p${Date.now()}`, name: '', phone: '' }];
    });
  }, []);
  const removePhoneRow = useCallback((id: string) => {
    setPhoneRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);
  const updatePhoneRow = useCallback((id: string, key: 'name' | 'phone', value: string) => {
    setPhoneRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  const parseCsv = useCallback((text: string): { rows: ParsedRow[]; skipped: SkippedRow[] } => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return { rows: [], skipped: [] };

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const phoneIdx = header.indexOf('phone');

    if (nameIdx === -1) {
      return {
        rows: [],
        skipped: [{ rowNumber: 1, reason: 'Missing required "name" column in header' }],
      };
    }

    const rows: ParsedRow[] = [];
    const skipped: SkippedRow[] = [];

    for (let i = 1; i < Math.min(lines.length, 501); i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const name = cols[nameIdx] ?? '';
      const email = emailIdx >= 0 ? cols[emailIdx] ?? '' : '';
      const phone = phoneIdx >= 0 ? cols[phoneIdx] ?? '' : '';

      if (!name) {
        skipped.push({ rowNumber: i + 1, reason: 'Missing name' });
        continue;
      }
      const hasEmail = email && isEmail(email);
      const hasPhone = phone && isPhone(phone);
      if (!hasEmail && !hasPhone) {
        skipped.push({
          rowNumber: i + 1,
          reason: 'Missing or invalid email/phone',
        });
        continue;
      }
      rows.push({
        name,
        email: hasEmail ? email : undefined,
        phone: hasPhone ? phone : undefined,
      });
    }

    if (lines.length > 501) {
      skipped.push({
        rowNumber: 501,
        reason: `${lines.length - 501} extra rows skipped (500 row max)`,
      });
    }

    return { rows, skipped };
  }, []);

  const handleParseBulkText = useCallback(
    (text: string) => {
      setBulkText(text);
      if (!text.trim()) {
        setParsedRows([]);
        setSkippedRows([]);
        return;
      }
      const { rows, skipped } = parseCsv(text);
      setParsedRows(rows);
      setSkippedRows(skipped);
    },
    [parseCsv],
  );

  const handleChooseFile = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt';
        input.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          const text = await file.text();
          handleParseBulkText(text);
        };
        input.click();
      } catch (err) {
        console.log('[InviteCustomers] file pick error', err);
      }
    } else {
      setSnackMsg('Paste your CSV content below to upload');
      setSnackVisible(true);
    }
  }, [handleParseBulkText]);

  const handleDownloadTemplate = useCallback(async () => {
    const template = `name,email,phone\nAarav Sharma,aarav@example.com,+919876543210\nPriya Patel,,+919812345678\nRohan Mehta,rohan@example.com,`;
    try {
      await Clipboard.setStringAsync(template);
      setSnackMsg('Template copied to clipboard. Paste into your spreadsheet.');
      setSnackVisible(true);
    } catch (e) {
      console.log('[InviteCustomers] clipboard error', e);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (totalCount === 0) return;
    haptic();
    setConfirmVisible(true);
  }, [totalCount, haptic]);

  const handleConfirmSend = useCallback(() => {
    // In a real app, this would insert into `business_invitations` Supabase table.
    // Each recipient already carries its `channel` based on its source tab.
    console.log('[InviteCustomers] queuing invites', {
      businessId,
      total: totalCount,
      sms: smsCount,
      email: emailCount,
      customMessage,
      recipients: allRecipients,
    });
    setConfirmVisible(false);
    setSelectedContacts({});
    setContactPhoneIdx({});
    setEmailRows([{ id: 'e1', name: '', email: '' }]);
    setPhoneRows([{ id: 'p1', name: '', phone: '' }]);
    setParsedRows([]);
    setSkippedRows([]);
    setBulkText('');
    setFileName('');
    setCustomMessage('');
    setSnackMsg('Invites queued! Your contacts will receive them shortly.');
    setSnackVisible(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [allRecipients, businessId, customMessage, smsCount, emailCount, totalCount]);

  const TABS: { key: TabKey; label: string; count: number; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
    { key: 'contacts', label: 'Contacts', count: contactsRecipients.length, Icon: Users },
    { key: 'email', label: 'Email', count: emailRecipients.length, Icon: Mail },
    { key: 'manual', label: 'Manual', count: phoneRecipients.length, Icon: Pencil },
    { key: 'bulk', label: 'Bulk', count: bulkRecipients.length, Icon: FileUp },
  ];

  const confirmHeadline =
    smsCount > 0 && emailCount > 0
      ? `You're about to send ${totalCount} invite${totalCount === 1 ? '' : 's'} to join ${businessName} on TouchPoint. ${smsCount} will receive an SMS, ${emailCount} will receive an Email.`
      : smsCount > 0
        ? `You're about to send ${smsCount} SMS invite${smsCount === 1 ? '' : 's'} to join ${businessName} on TouchPoint.`
        : `You're about to send ${emailCount} email invite${emailCount === 1 ? '' : 's'} to join ${businessName} on TouchPoint.`;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} testID="invite-customers-back">
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Invite Customers</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {businessName}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.tabStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            const Icon = t.Icon;
            const iconColor = active ? '#FFFFFF' : ACCENT_MUTED;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => {
                  haptic();
                  setActiveTab(t.key);
                }}
                activeOpacity={0.85}
                style={[styles.tabPill, active ? styles.tabPillActive : styles.tabPillInactive]}
                testID={`invite-tab-${t.key}`}
              >
                <Icon size={16} color={iconColor} />
                <Text style={[styles.tabPillLabel, active ? styles.tabPillLabelActive : styles.tabPillLabelInactive]}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View style={[styles.tabCountBadge, active && styles.tabCountBadgeActive]}>
                    <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                      {t.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Divider />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'contacts' && (
            <ContactsTab
              contacts={filteredContacts}
              selected={selectedContacts}
              onToggle={toggleContact}
              search={contactSearch}
              onSearch={setContactSearch}
              allSelected={allSelected}
              onToggleAll={toggleSelectAll}
              selectedCount={contactsRecipients.length}
              phoneIdx={contactPhoneIdx}
              onOpenPhonePicker={setPhonePickerFor}
            />
          )}
          {activeTab === 'email' && (
            <EmailTab
              rows={emailRows}
              onUpdate={updateEmailRow}
              onAdd={addEmailRow}
              onRemove={removeEmailRow}
            />
          )}
          {activeTab === 'manual' && (
            <PhoneTab
              rows={phoneRows}
              onUpdate={updatePhoneRow}
              onAdd={addPhoneRow}
              onRemove={removePhoneRow}
            />
          )}
          {activeTab === 'bulk' && (
            <BulkTab
              bulkText={bulkText}
              onBulkTextChange={handleParseBulkText}
              parsedRows={parsedRows}
              skippedRows={skippedRows}
              fileName={fileName}
              onChooseFile={handleChooseFile}
              onDownloadTemplate={handleDownloadTemplate}
              formatGuideOpen={formatGuideOpen}
              onToggleFormatGuide={() => setFormatGuideOpen((v) => !v)}
              skippedOpen={skippedOpen}
              onToggleSkipped={() => setSkippedOpen((v) => !v)}
            />
          )}

          <View style={styles.composerSection}>
            <Text style={styles.composerLabel}>Add a personal note (optional)</Text>
            <PaperTextInput
              mode="outlined"
              value={customMessage}
              onChangeText={(t) => setCustomMessage(t.slice(0, 200))}
              placeholder="e.g. Hey! We'd love to have you as part of our loyalty program 🎉"
              outlineColor="#E8F5EE"
              activeOutlineColor={ACCENT}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: '#fff' }}
              testID="invite-custom-message"
            />
            <Text style={styles.charCounter}>{customMessage.length} / 200</Text>

            <Text style={[styles.composerLabel, { marginTop: 8 }]}>Preview</Text>
            <Surface style={styles.previewCard} elevation={1}>
              <View style={styles.previewHeader}>
                <View style={styles.previewAvatar}>
                  <Text style={styles.previewAvatarText}>{initialsOf(businessName)}</Text>
                </View>
                <Text style={styles.previewBusinessName}>{businessName}</Text>
              </View>
              <Text style={styles.previewLine}>
                📬 You&apos;re invited to join {businessName} on TouchPoint!
              </Text>
              <Text style={styles.previewBody}>
                Subscribe to earn points, unlock exclusive rewards, and get notified about
                special offers.
              </Text>
              {customMessage.trim().length > 0 && (
                <Text style={styles.previewCustom}>“{customMessage.trim()}”</Text>
              )}
              <Text style={styles.previewLink}>👉 Join here: {referralLink}</Text>
              <Text style={styles.previewFooter}>— Sent via TouchPoint</Text>
            </Surface>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <SafeAreaView edges={['bottom']}>
            <PaperButton
              mode="contained"
              onPress={handleSend}
              disabled={totalCount === 0}
              buttonColor={ACCENT}
              icon={() => <Send size={18} color="#fff" />}
              contentStyle={{ paddingVertical: 6 }}
              style={styles.sendBtn}
              labelStyle={styles.sendBtnLabel}
              testID="invite-send-btn"
            >
              {totalCount === 0
                ? 'Select contacts to invite'
                : `Send Invites to ${totalCount} ${totalCount === 1 ? 'contact' : 'contacts'}`}
            </PaperButton>
            {totalCount > 0 && (
              <Text style={styles.sendBtnSubtitle}>
                {smsCount > 0 ? `${smsCount} SMS` : ''}
                {smsCount > 0 && emailCount > 0 ? ' · ' : ''}
                {emailCount > 0 ? `${emailCount} Email` : ''}
              </Text>
            )}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>

      <Portal>
        <Modal
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          contentContainerStyle={styles.modalCard}
        >
          <Text style={styles.modalTitle}>Ready to send?</Text>
          <Text style={styles.modalHeadline}>{confirmHeadline}</Text>

          <Divider style={{ marginVertical: 12 }} />

          {contactsRecipients.length > 0 && (
            <View style={styles.modalRow}>
              <Smartphone size={18} color={ACCENT} />
              <Text style={styles.modalRowText}>
                <Text style={styles.modalBold}>📱 Contacts:</Text> {contactsRecipients.length} via SMS
              </Text>
            </View>
          )}
          {phoneRecipients.length > 0 && (
            <View style={styles.modalRow}>
              <Phone size={18} color={ACCENT} />
              <Text style={styles.modalRowText}>
                <Text style={styles.modalBold}>✏️ Manual:</Text> {phoneRecipients.length} via SMS
              </Text>
            </View>
          )}
          {emailRecipients.length > 0 && (
            <View style={styles.modalRow}>
              <AtSign size={18} color={ACCENT} />
              <Text style={styles.modalRowText}>
                <Text style={styles.modalBold}>✉️ Email:</Text> {emailRecipients.length} via Email
              </Text>
            </View>
          )}
          {bulkRecipients.length > 0 && (
            <View style={styles.modalRow}>
              <Upload size={18} color={ACCENT} />
              <Text style={styles.modalRowText}>
                <Text style={styles.modalBold}>📂 Bulk Upload:</Text> {bulkRecipients.length}
                {(bulkSmsCount > 0 || bulkEmailCount > 0) && (
                  <Text style={styles.modalRowMuted}>
                    {' '}
                    ({bulkSmsCount > 0 ? `${bulkSmsCount} SMS` : ''}
                    {bulkSmsCount > 0 && bulkEmailCount > 0 ? ' + ' : ''}
                    {bulkEmailCount > 0 ? `${bulkEmailCount} Email` : ''})
                  </Text>
                )}
              </Text>
            </View>
          )}

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {totalCount} invite{totalCount === 1 ? '' : 's'}
            </Text>
          </View>

          <Text style={[styles.modalLabel, { marginTop: 12 }]}>Business</Text>
          <Text style={styles.modalValue}>{businessName}</Text>
          <Text style={[styles.modalLabel, { marginTop: 8 }]}>Custom message</Text>
          <Text style={styles.modalValue}>
            {customMessage.trim() ? customMessage.trim() : 'None'}
          </Text>
          <View style={styles.modalActions}>
            <PaperButton
              mode="outlined"
              onPress={() => setConfirmVisible(false)}
              textColor={MUTED}
              style={{ flex: 1, marginRight: 8 }}
            >
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleConfirmSend}
              buttonColor={ACCENT}
              style={{ flex: 1 }}
              testID="invite-confirm-send"
            >
              Confirm & Send
            </PaperButton>
          </View>
        </Modal>

        <Modal
          visible={phonePickerFor !== null}
          onDismiss={() => setPhonePickerFor(null)}
          contentContainerStyle={styles.modalCard}
        >
          <Text style={styles.modalTitle}>Choose phone number</Text>
          {phonePickerFor &&
            (phoneContacts.find((c) => c.id === phonePickerFor)?.phones ?? []).map((p, i) => {
              const currentIdx = contactPhoneIdx[phonePickerFor] ?? 0;
              const active = i === currentIdx;
              return (
                <TouchableOpacity
                  key={`${phonePickerFor}-${i}`}
                  onPress={() => {
                    setContactPhoneIdx((prev) => ({ ...prev, [phonePickerFor]: i }));
                    setPhonePickerFor(null);
                  }}
                  style={[styles.phonePickerRow, active && styles.phonePickerRowActive]}
                  activeOpacity={0.7}
                >
                  <Phone size={14} color={active ? ACCENT : MUTED} />
                  <Text style={[styles.phonePickerText, active && styles.phonePickerTextActive]}>
                    {p}
                  </Text>
                  {active && <CheckCircle2 size={16} color={ACCENT} />}
                </TouchableOpacity>
              );
            })}
          <PaperButton
            mode="text"
            onPress={() => setPhonePickerFor(null)}
            textColor={MUTED}
            style={{ marginTop: 8 }}
          >
            Close
          </PaperButton>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2800}
        style={{ backgroundColor: GREEN, marginBottom: 90 }}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

function ContactsTab({
  contacts,
  selected,
  onToggle,
  search,
  onSearch,
  allSelected,
  onToggleAll,
  selectedCount,
  phoneIdx,
  onOpenPhonePicker,
}: {
  contacts: MockContact[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
  selectedCount: number;
  phoneIdx: Record<string, number>;
  onOpenPhonePicker: (id: string) => void;
}) {
  return (
    <View>
      <View style={styles.searchRow}>
        <Search size={16} color={MUTED} />
        <PaperTextInput
          mode="flat"
          dense
          value={search}
          onChangeText={onSearch}
          placeholder="Search contacts"
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          style={styles.searchInput}
          theme={{ colors: { background: 'transparent' } }}
        />
      </View>

      <View style={styles.selectAllRow}>
        <Text style={styles.contactsHint}>
          {selectedCount > 0
            ? `${selectedCount} selected — sent via SMS`
            : 'Pick people from your contacts (SMS only)'}
        </Text>
        <TouchableOpacity onPress={onToggleAll} hitSlop={8}>
          <Text style={styles.selectAllText}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Text>
        </TouchableOpacity>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No contacts match your search</Text>
        </View>
      ) : (
        <View style={styles.contactsList}>
          {contacts.map((c, i) => {
            const isOn = !!selected[c.id];
            const idx = phoneIdx[c.id] ?? 0;
            const currentPhone = c.phones[idx];
            const hasMultiple = c.phones.length > 1;
            return (
              <React.Fragment key={c.id}>
                {i > 0 && <View style={styles.contactSeparator} />}
                <TouchableOpacity
                  onPress={() => onToggle(c.id)}
                  activeOpacity={0.7}
                  style={[styles.contactRow, isOn && styles.contactRowActive]}
                  testID={`contact-${c.id}`}
                >
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{initialsOf(c.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        if (hasMultiple) onOpenPhonePicker(c.id);
                      }}
                      activeOpacity={hasMultiple ? 0.6 : 1}
                      style={styles.contactMetaRow}
                      disabled={!hasMultiple}
                    >
                      <Phone size={11} color={MUTED} />
                      <Text style={styles.contactMetaText}>{currentPhone}</Text>
                      {hasMultiple && <ChevronDown size={12} color={ACCENT} />}
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.checkBox, isOn && styles.checkBoxOn]}>
                    {isOn && <CheckCircle2 size={18} color="#fff" />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
}

function EmailTab({
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rows: EmailRow[];
  onUpdate: (id: string, key: 'name' | 'email', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View>
      <Text style={styles.tabIntro}>Enter email addresses to invite</Text>
      <Text style={styles.contactsHint}>
        Add up to 20 people. All invites in this tab are sent via Email.
      </Text>
      {rows.map((row, idx) => {
        const e = row.email.trim();
        const isValid = e.length === 0 ? null : isEmail(e);
        return (
          <View key={row.id} style={styles.manualRow}>
            <View style={styles.manualRowHeader}>
              <Text style={styles.manualRowLabel}>Contact {idx + 1}</Text>
              {rows.length > 1 && (
                <TouchableOpacity onPress={() => onRemove(row.id)} hitSlop={8}>
                  <X size={16} color={RED} />
                </TouchableOpacity>
              )}
            </View>
            <PaperTextInput
              mode="outlined"
              dense
              value={row.name}
              onChangeText={(t) => onUpdate(row.id, 'name', t)}
              placeholder="Full name (optional)"
              outlineColor="#E8F5EE"
              activeOutlineColor={ACCENT}
              style={{ backgroundColor: '#fff' }}
            />
            <View style={{ height: 8 }} />
            <PaperTextInput
              mode="outlined"
              dense
              value={row.email}
              onChangeText={(t) => onUpdate(row.id, 'email', t)}
              placeholder="email@example.com"
              outlineColor={isValid === false ? RED : '#E8F5EE'}
              activeOutlineColor={isValid === false ? RED : ACCENT}
              style={{ backgroundColor: '#fff' }}
              keyboardType="email-address"
              autoCapitalize="none"
              left={
                <PaperTextInput.Icon
                  icon={() => <Mail size={16} color={isValid === false ? RED : ACCENT} />}
                />
              }
              right={
                isValid === true ? (
                  <PaperTextInput.Icon icon={() => <CheckCircle2 size={16} color={GREEN} />} />
                ) : undefined
              }
            />
            {isValid === false && (
              <View style={styles.manualStatusErr}>
                <XCircle size={13} color={RED} />
                <Text style={styles.manualStatusErrText}>Enter a valid email address</Text>
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity
        onPress={onAdd}
        activeOpacity={0.8}
        style={styles.addAnotherBtn}
        disabled={rows.length >= 20}
        testID="email-add-another"
      >
        <UserPlus size={15} color={ACCENT} />
        <Text style={styles.addAnotherText}>
          {rows.length >= 20 ? 'Maximum 20 entries' : '＋ Add Another'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function PhoneTab({
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rows: PhoneRow[];
  onUpdate: (id: string, key: 'name' | 'phone', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View>
      <Text style={styles.tabIntro}>Enter phone numbers to invite</Text>
      <Text style={styles.contactsHint}>
        Include country code for best delivery (e.g. +919876543210). Sent via SMS.
      </Text>
      {rows.map((row, idx) => {
        const p = row.phone.trim();
        const isValid = p.length === 0 ? null : isPhone(p);
        return (
          <View key={row.id} style={styles.manualRow}>
            <View style={styles.manualRowHeader}>
              <Text style={styles.manualRowLabel}>Contact {idx + 1}</Text>
              {rows.length > 1 && (
                <TouchableOpacity onPress={() => onRemove(row.id)} hitSlop={8}>
                  <X size={16} color={RED} />
                </TouchableOpacity>
              )}
            </View>
            <PaperTextInput
              mode="outlined"
              dense
              value={row.name}
              onChangeText={(t) => onUpdate(row.id, 'name', t)}
              placeholder="Full name (optional)"
              outlineColor="#E8F5EE"
              activeOutlineColor={ACCENT}
              style={{ backgroundColor: '#fff' }}
            />
            <View style={{ height: 8 }} />
            <PaperTextInput
              mode="outlined"
              dense
              value={row.phone}
              onChangeText={(t) => onUpdate(row.id, 'phone', t)}
              placeholder="+91 9876543210"
              outlineColor={isValid === false ? RED : '#E8F5EE'}
              activeOutlineColor={isValid === false ? RED : ACCENT}
              style={{ backgroundColor: '#fff' }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              left={
                <PaperTextInput.Icon
                  icon={() => <Phone size={16} color={isValid === false ? RED : ACCENT} />}
                />
              }
              right={
                isValid === true ? (
                  <PaperTextInput.Icon icon={() => <CheckCircle2 size={16} color={GREEN} />} />
                ) : undefined
              }
            />
            {isValid === false && (
              <View style={styles.manualStatusErr}>
                <XCircle size={13} color={RED} />
                <Text style={styles.manualStatusErrText}>Enter a valid phone number</Text>
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity
        onPress={onAdd}
        activeOpacity={0.8}
        style={styles.addAnotherBtn}
        disabled={rows.length >= 20}
        testID="phone-add-another"
      >
        <UserPlus size={15} color={ACCENT} />
        <Text style={styles.addAnotherText}>
          {rows.length >= 20 ? 'Maximum 20 entries' : '＋ Add Another'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function BulkTab({
  bulkText,
  onBulkTextChange,
  parsedRows,
  skippedRows,
  fileName,
  onChooseFile,
  onDownloadTemplate,
  formatGuideOpen,
  onToggleFormatGuide,
  skippedOpen,
  onToggleSkipped,
}: {
  bulkText: string;
  onBulkTextChange: (t: string) => void;
  parsedRows: ParsedRow[];
  skippedRows: SkippedRow[];
  fileName: string;
  onChooseFile: () => void;
  onDownloadTemplate: () => void;
  formatGuideOpen: boolean;
  onToggleFormatGuide: () => void;
  skippedOpen: boolean;
  onToggleSkipped: () => void;
}) {
  const emailCount = parsedRows.filter((r) => r.email).length;
  const smsOnlyCount = parsedRows.filter((r) => !r.email && r.phone).length;

  return (
    <View>
      <View style={styles.uploadZone}>
        <FileUp size={28} color={ACCENT} />
        <Text style={styles.uploadTitle}>Upload a CSV file</Text>
        <Text style={styles.uploadSubtitle}>
          {Platform.OS === 'web'
            ? '.csv up to 500 rows'
            : 'Paste CSV content below — file picker is web-only'}
        </Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            onPress={onChooseFile}
            activeOpacity={0.85}
            style={styles.chooseFileBtn}
            testID="bulk-choose-file"
          >
            <Text style={styles.chooseFileText}>Choose File</Text>
          </TouchableOpacity>
        )}
        {fileName.length > 0 && (
          <Text style={styles.fileNameText}>
            📄 {fileName} — {parsedRows.length} valid {parsedRows.length === 1 ? 'row' : 'rows'}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={onToggleFormatGuide}
        activeOpacity={0.7}
        style={styles.guideHeader}
      >
        <Text style={styles.guideHeaderText}>📋 How to format your file</Text>
        {formatGuideOpen ? (
          <ChevronUp size={16} color={ACCENT} />
        ) : (
          <ChevronDown size={16} color={ACCENT} />
        )}
      </TouchableOpacity>
      {formatGuideOpen && (
        <View style={styles.guideBody}>
          <Text style={styles.guideTitle}>Required columns:</Text>
          <Text style={styles.guideLine}><Text style={styles.guideBold}>name</Text> — required</Text>
          <Text style={styles.guideLine}><Text style={styles.guideBold}>email</Text> — optional*</Text>
          <Text style={styles.guideLine}><Text style={styles.guideBold}>phone</Text> — optional* (with country code)</Text>
          <Text style={styles.guideHint}>*At least one of email or phone must be provided.</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.guideTip}>✅ First row must be the header</Text>
          <Text style={styles.guideTip}>✅ Use exact column names: name, email, phone</Text>
          <Text style={styles.guideTip}>✅ Include country code in phone numbers</Text>
          <Text style={styles.guideTip}>✅ Up to 500 rows per upload</Text>
          <Text style={styles.guideTip}>❌ Extra columns are ignored</Text>
          <TouchableOpacity
            onPress={onDownloadTemplate}
            style={styles.templateBtn}
            activeOpacity={0.8}
            testID="bulk-download-template"
          >
            <Download size={14} color={ACCENT} />
            <Text style={styles.templateBtnText}>Copy sample template</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 12 }} />
      <Text style={styles.composerLabel}>Or paste CSV content</Text>
      <PaperTextInput
        mode="outlined"
        value={bulkText}
        onChangeText={onBulkTextChange}
        placeholder={`name,email,phone\nAarav Sharma,aarav@example.com,+919876543210`}
        outlineColor="#E8F5EE"
        activeOutlineColor={ACCENT}
        multiline
        numberOfLines={6}
        style={{ backgroundColor: '#fff', minHeight: 120 }}
        autoCapitalize="none"
        testID="bulk-text-input"
      />

      {parsedRows.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            ✅ {parsedRows.length} valid {parsedRows.length === 1 ? 'contact' : 'contacts'} loaded
          </Text>
          <Text style={styles.summarySub}>
            {emailCount} via Email · {smsOnlyCount} via SMS
            {skippedRows.length > 0 ? ` · ${skippedRows.length} skipped` : ''}
          </Text>
          <View style={{ height: 8 }} />
          <Text style={styles.previewRowsTitle}>Preview (first 5 rows)</Text>
          {parsedRows.slice(0, 5).map((r, i) => (
            <View key={i} style={styles.previewRow}>
              <Text style={styles.previewRowName}>{r.name}</Text>
              <Text style={styles.previewRowMeta}>
                {r.email ?? r.phone ?? ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {skippedRows.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <TouchableOpacity
            onPress={onToggleSkipped}
            activeOpacity={0.7}
            style={styles.skippedHeader}
          >
            <Text style={styles.skippedHeaderText}>
              ⚠️ {skippedRows.length} skipped {skippedRows.length === 1 ? 'row' : 'rows'}
            </Text>
            {skippedOpen ? (
              <ChevronUp size={16} color={RED} />
            ) : (
              <ChevronDown size={16} color={RED} />
            )}
          </TouchableOpacity>
          {skippedOpen && (
            <View style={styles.skippedBody}>
              {skippedRows.map((s, i) => (
                <Text key={i} style={styles.skippedItem}>
                  Row {s.rowNumber}: {s.reason}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FB' },
  header: {
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' as const },
  headerSubtitle: { color: '#E8F5EE', fontSize: 12, marginTop: 2 },
  tabStripWrap: { backgroundColor: '#fff' },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    height: 44,
    minWidth: 90,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabPillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BORDER_SOFT,
  },
  tabPillActive: {
    backgroundColor: ACCENT,
    borderWidth: 0,
    shadowColor: ACCENT,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabPillLabel: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  tabPillLabelInactive: { color: ACCENT_MUTED },
  tabPillLabelActive: { color: '#FFFFFF' },
  tabCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BADGE_ACCENT,
  },
  tabCountBadgeActive: { backgroundColor: '#FFFFFF' },
  tabCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' as const },
  tabCountTextActive: { color: ACCENT },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  tabIntro: {
    color: '#1A5C35',
    fontWeight: '700' as const,
    fontSize: 14,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SEARCH_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: { flex: 1, backgroundColor: 'transparent', height: 38 },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  selectAllText: { color: ACCENT, fontWeight: '600' as const, fontSize: 13 },
  contactsHint: { color: MUTED, fontSize: 12 },
  contactsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  contactRowActive: { backgroundColor: ACCENT_LIGHT },
  contactSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EFEAF7',
    marginLeft: 72,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  contactName: { color: '#1A1A2E', fontWeight: '600' as const, fontSize: 14 },
  contactMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, alignItems: 'center' },
  contactMetaText: { color: '#888', fontSize: 12 },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { color: MUTED, fontSize: 13 },
  manualRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EFEAF7',
  },
  manualRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualRowLabel: { color: '#1A5C35', fontWeight: '600' as const, fontSize: 13 },
  manualStatusErr: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  manualStatusErrText: { color: RED, fontSize: 11, fontWeight: '600' as const },
  addAnotherBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_LIGHT,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  addAnotherText: { color: ACCENT, fontWeight: '600' as const, fontSize: 13 },
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ACCENT,
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  uploadTitle: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 14, marginTop: 8 },
  uploadSubtitle: { color: MUTED, fontSize: 12, marginTop: 4, textAlign: 'center' },
  chooseFileBtn: {
    marginTop: 12,
    backgroundColor: ACCENT,
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  chooseFileText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
  fileNameText: { marginTop: 10, color: '#1A5C35', fontSize: 12 },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EFEAF7',
  },
  guideHeaderText: { color: '#1A5C35', fontWeight: '600' as const, fontSize: 13 },
  guideBody: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#EFEAF7',
  },
  guideTitle: { fontWeight: '700' as const, color: '#1A5C35', fontSize: 13, marginBottom: 4 },
  guideLine: { color: '#1A5C35', fontSize: 12, marginTop: 2 },
  guideBold: { fontWeight: '700' as const, color: '#1A5C35' },
  guideHint: { color: MUTED, fontSize: 11, marginTop: 4, fontStyle: 'italic' as const },
  guideTip: { color: '#1A5C35', fontSize: 12, marginTop: 3 },
  templateBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: ACCENT_LIGHT,
  },
  templateBtnText: { color: ACCENT, fontWeight: '600' as const, fontSize: 12 },
  summaryCard: {
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BDE7D7',
  },
  summaryTitle: { color: GREEN, fontWeight: '700' as const, fontSize: 13 },
  summarySub: { color: '#0F6E56', fontSize: 11, marginTop: 2 },
  previewRowsTitle: { color: '#1A5C35', fontWeight: '600' as const, fontSize: 12, marginTop: 4 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BDE7D7',
  },
  previewRowName: { color: '#1A5C35', fontSize: 12, fontWeight: '600' as const, flex: 1 },
  previewRowMeta: { color: MUTED, fontSize: 11, flex: 1, textAlign: 'right' as const },
  skippedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F4C7C7',
  },
  skippedHeaderText: { color: RED, fontWeight: '600' as const, fontSize: 13 },
  skippedBody: { backgroundColor: '#FFF4F4', borderRadius: 10, padding: 12, marginTop: 6 },
  skippedItem: { color: '#A32D2D', fontSize: 12, marginTop: 2 },
  composerSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8F5EE',
  },
  composerLabel: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 13, marginBottom: 6 },
  charCounter: { color: MUTED, fontSize: 11, textAlign: 'right' as const, marginTop: 4 },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
  previewBusinessName: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 14 },
  previewLine: { color: '#1A5C35', fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  previewBody: { color: '#1A5C35', fontSize: 13, lineHeight: 18 },
  previewCustom: {
    color: '#1A5C35',
    fontSize: 13,
    fontStyle: 'italic' as const,
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  previewLink: { color: ACCENT, fontSize: 12, marginTop: 8, fontWeight: '600' as const },
  previewFooter: { color: MUTED, fontSize: 11, marginTop: 6, fontStyle: 'italic' as const },
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8F5EE',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sendBtn: { borderRadius: 12 },
  sendBtnLabel: { fontWeight: '700' as const, fontSize: 14 },
  sendBtnSubtitle: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600' as const,
  },
  modalCard: {
    backgroundColor: '#fff',
    margin: 24,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 17, marginBottom: 8 },
  modalHeadline: { color: '#1A5C35', fontSize: 13, lineHeight: 18 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  modalRowText: { color: '#1A5C35', fontSize: 13, flex: 1 },
  modalRowMuted: { color: MUTED, fontSize: 12 },
  modalBold: { fontWeight: '700' as const, color: '#1A5C35' },
  modalLabel: { color: MUTED, fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const },
  modalValue: { color: '#1A5C35', fontSize: 13, marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ACCENT_LIGHT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  totalLabel: { color: ACCENT, fontWeight: '700' as const, fontSize: 13 },
  totalValue: { color: ACCENT, fontWeight: '700' as const, fontSize: 14 },
  modalActions: { flexDirection: 'row', marginTop: 18 },
  phonePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAF7',
    marginTop: 8,
    backgroundColor: '#fff',
  },
  phonePickerRowActive: { borderColor: ACCENT, backgroundColor: ACCENT_LIGHT },
  phonePickerText: { color: '#1A5C35', fontSize: 13, flex: 1 },
  phonePickerTextActive: { color: ACCENT, fontWeight: '700' as const },
});
