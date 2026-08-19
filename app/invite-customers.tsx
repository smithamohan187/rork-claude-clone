import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Linking,
  ActivityIndicator,
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
  FileUp,
  Send,
  Users,
  Pencil,
  ShieldCheck,
  History,
} from 'lucide-react-native';
import {
  TextInput as PaperTextInput,
  Button as PaperButton,
  Portal,
  Modal,
  Surface,
  Divider,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useInviteCustomers, EmailRow, ManualRow, SendResultRow } from '@/hooks/useInviteCustomers';
import { useCustomerInviteHistory } from '@/hooks/useCustomerInviteHistory';
import { DeviceContact } from '@/api/services/contactsService';
import { CustomerInvite, CustomerInviteStatus } from '@/api/services/customerInviteService';
import { CsvPreviewRow } from '@/api/services/fileParseService';

const ACCENT = '#00B246';
const ACCENT_LIGHT = '#EDE9F6';
const ACCENT_MUTED = '#E8F5EE';
const BORDER_SOFT = '#E8F5EE';
const SEARCH_BG = '#E8F5EE';
const BADGE_ACCENT = '#FF6B35';
const GREEN = '#0F6E56';
const RED = '#E24B4A';
const MUTED = '#888780';

type TabKey = 'contacts' | 'email' | 'manual' | 'csv';

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
};

const isValidEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isValidPhone = (s: string): boolean => {
  const stripped = s.trim().replace(/[\s\-().]/g, '');
  return /^\+?[1-9]\d{6,14}$/.test(stripped);
};

export default function InviteCustomersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ businessId?: string; businessName?: string }>();
  const businessId = params.businessId ?? '';
  const businessName = params.businessName ?? 'Your Business';

  const inv = useInviteCustomers(businessId, businessName);
  const history = useCustomerInviteHistory(businessId);
  const [confirmVisible, setConfirmVisible] = React.useState<boolean>(false);
  const [phonePickerFor, setPhonePickerFor] = React.useState<string | null>(null);

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSend = useCallback(() => {
    if (inv.totalCount === 0) return;
    haptic();
    setConfirmVisible(true);
  }, [inv.totalCount, haptic]);

  const handleConfirmSend = useCallback(async () => {
    setConfirmVisible(false);
    await inv.submit();
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [inv]);

  const TABS: { key: TabKey; label: string; count: number; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
    { key: 'contacts', label: 'Contacts', count: inv.selectedContactsCount, Icon: Users },
    { key: 'email', label: 'Email', count: inv.validEmailCount, Icon: Mail },
    { key: 'manual', label: 'Manual', count: inv.validManualCount, Icon: Pencil },
    { key: 'csv', label: 'Upload', count: inv.csvValidCount, Icon: FileUp },
  ];

  const confirmHeadline = `You're about to send ${inv.totalCount} invite${inv.totalCount === 1 ? '' : 's'} to join ${businessName} on TouchPoints.`;

  const phonePickerContact = phonePickerFor
    ? inv.filteredContacts.find((c) => c.id === phonePickerFor)
    : null;

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
        <TouchableOpacity onPress={history.open} hitSlop={12} testID="invite-history-btn">
          <History size={20} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.tabStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const active = inv.activeTab === t.key;
            const Icon = t.Icon;
            const iconColor = active ? '#FFFFFF' : ACCENT_MUTED;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => {
                  haptic();
                  inv.setActiveTab(t.key);
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {inv.activeTab === 'contacts' && (
            <ContactsTab
              permissionStatus={inv.contactsPermission.status}
              loading={inv.contactsLoading}
              contacts={inv.filteredContacts}
              selected={inv.selectedContactIds}
              onToggle={inv.toggleContact}
              search={inv.contactSearch}
              onSearch={inv.setContactSearch}
              allSelected={inv.allContactsSelected}
              onToggleAll={inv.toggleSelectAllContacts}
              selectedCount={inv.selectedContactsCount}
              phoneIdx={inv.contactPhoneIdx}
              onOpenPhonePicker={setPhonePickerFor}
              onImport={inv.importContacts}
              onSwitchTab={() => inv.setActiveTab('manual')}
            />
          )}
          {inv.activeTab === 'email' && (
            <EmailTab
              rows={inv.emailRows}
              onUpdate={inv.updateEmailRow}
              onAdd={inv.addEmailRow}
              onRemove={inv.removeEmailRow}
            />
          )}
          {inv.activeTab === 'manual' && (
            <ManualTab
              rows={inv.manualRows}
              onUpdate={inv.updateManualRow}
              onAdd={inv.addManualRow}
              onRemove={inv.removeManualRow}
            />
          )}
          {inv.activeTab === 'csv' && (
            <CsvTab
              fileName={inv.csvFileName}
              previewRows={inv.csvPreviewRows}
              error={inv.csvError}
              onPickFile={inv.pickAndParseCsv}
            />
          )}

          {inv.lastResults && inv.lastResults.length > 0 && <SendResultsCard results={inv.lastResults} />}

          <View style={styles.composerSection}>
            <Text style={styles.composerLabel}>Preview</Text>
            <Surface style={styles.previewCard} elevation={1}>
              <View style={styles.previewHeader}>
                <View style={styles.previewAvatar}>
                  <Text style={styles.previewAvatarText}>{initialsOf(businessName)}</Text>
                </View>
                <Text style={styles.previewBusinessName}>{businessName}</Text>
              </View>
              <Text style={styles.previewLine}>
                📬 You&apos;re invited to join {businessName} on TouchPoints!
              </Text>
              <Text style={styles.previewBody}>
                Subscribe to earn points, unlock exclusive rewards,and get notified about
                special offers. Each invite carries a unique link so we can let {businessName}
                know when you join.
              </Text>
              <Text style={styles.previewFooter}>— Sent via TouchPoints</Text>
            </Surface>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <SafeAreaView edges={['bottom']}>
            <PaperButton
              mode="contained"
              onPress={handleSend}
              disabled={inv.totalCount === 0 || inv.isSubmitting}
              buttonColor={ACCENT}
              icon={() => (inv.isSubmitting ? undefined : <Send size={18} color="#fff" />)}
              contentStyle={{ paddingVertical: 6 }}
              style={styles.sendBtn}
              labelStyle={styles.sendBtnLabel}
              loading={inv.isSubmitting}
              testID="invite-send-btn"
            >
              {inv.totalCount === 0
                ? 'Select customers to invite'
                : `Send Invites to ${inv.totalCount} ${inv.totalCount === 1 ? 'customer' : 'customers'}`}
            </PaperButton>
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

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {inv.totalCount} invite{inv.totalCount === 1 ? '' : 's'}
            </Text>
          </View>

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
          {phonePickerContact?.phones.map((p, i) => {
            const currentIdx = phonePickerFor ? inv.contactPhoneIdx[phonePickerFor] ?? 0 : 0;
            const active = i === currentIdx;
            return (
              <TouchableOpacity
                key={`${phonePickerFor}-${i}`}
                onPress={() => {
                  if (!phonePickerFor) return;
                  inv.setContactPhoneIdx((prev) => ({ ...prev, [phonePickerFor]: i }));
                  setPhonePickerFor(null);
                }}
                style={[styles.phonePickerRow, active && styles.phonePickerRowActive]}
                activeOpacity={0.7}
              >
                <Phone size={14} color={active ? ACCENT : MUTED} />
                <Text style={[styles.phonePickerText, active && styles.phonePickerTextActive]}>{p}</Text>
                {active && <CheckCircle2 size={16} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
          <PaperButton mode="text" onPress={() => setPhonePickerFor(null)} textColor={MUTED} style={{ marginTop: 8 }}>
            Close
          </PaperButton>
        </Modal>

        <Modal
          visible={history.visible}
          onDismiss={history.close}
          contentContainerStyle={styles.historyModalCard}
        >
          <Text style={styles.modalTitle}>Sent Invites</Text>
          <ScrollView style={{ maxHeight: 420 }} testID="invite-history-list">
            {history.loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={ACCENT} />
              </View>
            ) : history.error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{history.error}</Text>
              </View>
            ) : history.invites.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No invites sent yet</Text>
              </View>
            ) : (
              history.invites.map((item) => <InviteHistoryRow key={item.id} invite={item} />)
            )}
          </ScrollView>
          <PaperButton mode="text" onPress={history.close} textColor={MUTED} style={{ marginTop: 8 }}>
            Close
          </PaperButton>
        </Modal>
      </Portal>
    </View>
  );
}

const STATUS_LABEL: Record<CustomerInviteStatus, string> = {
  sent: 'Sent',
  registered: 'Registered',
  subscribed: 'Subscribed',
};

function InviteHistoryRow({ invite }: { invite: CustomerInvite }) {
  return (
    <View style={styles.historyRow} testID={`invite-history-row-${invite.id}`}>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyRowName} numberOfLines={1}>
          {invite.invitee_name || invite.invitee_identifier}
        </Text>
        <Text style={styles.historyRowMeta} numberOfLines={1}>
          {invite.invitee_identifier} · {invite.channel}
        </Text>
      </View>
      <Text
        style={[
          styles.csvStatusBadge,
          invite.status === 'subscribed' && styles.csvStatusValid,
          invite.status === 'registered' && styles.csvStatusDuplicate,
          invite.status === 'sent' && styles.historyStatusPending,
        ]}
      >
        {STATUS_LABEL[invite.status]}
      </Text>
    </View>
  );
}

function ContactsTab({
  permissionStatus,
  loading,
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
  onImport,
  onSwitchTab,
}: {
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  loading: boolean;
  contacts: DeviceContact[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
  selectedCount: number;
  phoneIdx: Record<string, number>;
  onOpenPhonePicker: (id: string) => void;
  onImport: () => void;
  onSwitchTab: () => void;
}) {
  if (permissionStatus === 'undetermined') {
    return (
      <View style={styles.importPrompt}>
        <Users size={32} color={ACCENT} />
        <Text style={styles.importTitle}>Import your contacts</Text>
        <Text style={styles.importSubtitle}>
          We&apos;ll ask for permission to access your contacts so you can pick who to invite.
        </Text>
        <TouchableOpacity onPress={onImport} activeOpacity={0.85} style={styles.importBtn} testID="import-contacts-btn">
          <Text style={styles.importBtnText}>Import from Contacts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.rationale}>
        <View style={styles.rationaleIcon}>
          <ShieldCheck size={18} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rationaleTitle}>Contacts access disabled</Text>
          <Text style={styles.rationaleBody}>
            Enable Contacts access in Settings to invite people from your address book, or use the
            Email, Manual, or Upload tabs instead.
          </Text>
          <View style={styles.rationaleActions}>
            <TouchableOpacity
              onPress={() => { try { (Linking as any).openSettings?.(); } catch {} }}
              style={styles.rationaleBtn}
              testID="open-settings-btn"
            >
              <Text style={styles.rationaleBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSwitchTab} style={styles.rationaleBtnGhost}>
              <Text style={styles.rationaleBtnGhostText}>Use Manual entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color={ACCENT} />
        <Text style={[styles.emptyText, { marginTop: 8 }]}>Loading contacts…</Text>
      </View>
    );
  }

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
          {selectedCount > 0 ? `${selectedCount} selected` : 'Pick people from your contacts'}
        </Text>
        <TouchableOpacity onPress={onToggleAll} hitSlop={8}>
          <Text style={styles.selectAllText}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
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
            const currentPhone = c.phones[idx] ?? c.emails[0] ?? '';
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
      <Text style={styles.contactsHint}>Add up to 20 people.</Text>
      {rows.map((row, idx) => {
        const e = row.email.trim();
        const valid = e.length === 0 ? null : isValidEmail(e);
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
              outlineColor={valid === false ? RED : '#E8F5EE'}
              activeOutlineColor={valid === false ? RED : ACCENT}
              style={{ backgroundColor: '#fff' }}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<PaperTextInput.Icon icon={() => <Mail size={16} color={valid === false ? RED : ACCENT} />} />}
              right={valid === true ? <PaperTextInput.Icon icon={() => <CheckCircle2 size={16} color={GREEN} />} /> : undefined}
            />
            {valid === false && (
              <View style={styles.manualStatusErr}>
                <XCircle size={13} color={RED} />
                <Text style={styles.manualStatusErrText}>Enter a valid email address</Text>
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity onPress={onAdd} activeOpacity={0.8} style={styles.addAnotherBtn} disabled={rows.length >= 20} testID="email-add-another">
        <UserPlus size={15} color={ACCENT} />
        <Text style={styles.addAnotherText}>{rows.length >= 20 ? 'Maximum 20 entries' : '＋ Add Another'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ManualTab({
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rows: ManualRow[];
  onUpdate: (id: string, key: 'name' | 'phone' | 'email', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View>
      <Text style={styles.tabIntro}>Add customers manually</Text>
      <Text style={styles.contactsHint}>Enter a phone or email (or both) for each person.</Text>
      {rows.map((row, idx) => {
        const p = row.phone.trim();
        const e = row.email.trim();
        const phoneValid = p.length === 0 ? null : isValidPhone(p);
        const emailValid = e.length === 0 ? null : isValidEmail(e);
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
              outlineColor={phoneValid === false ? RED : '#E8F5EE'}
              activeOutlineColor={phoneValid === false ? RED : ACCENT}
              style={{ backgroundColor: '#fff' }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              left={<PaperTextInput.Icon icon={() => <Phone size={16} color={phoneValid === false ? RED : ACCENT} />} />}
            />
            <View style={{ height: 8 }} />
            <PaperTextInput
              mode="outlined"
              dense
              value={row.email}
              onChangeText={(t) => onUpdate(row.id, 'email', t)}
              placeholder="email@example.com (optional)"
              outlineColor={emailValid === false ? RED : '#E8F5EE'}
              activeOutlineColor={emailValid === false ? RED : ACCENT}
              style={{ backgroundColor: '#fff' }}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<PaperTextInput.Icon icon={() => <Mail size={16} color={emailValid === false ? RED : ACCENT} />} />}
            />
            {(phoneValid === false || emailValid === false) && (
              <View style={styles.manualStatusErr}>
                <XCircle size={13} color={RED} />
                <Text style={styles.manualStatusErrText}>
                  {phoneValid === false ? 'Enter a valid phone number' : 'Enter a valid email address'}
                </Text>
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity onPress={onAdd} activeOpacity={0.8} style={styles.addAnotherBtn} disabled={rows.length >= 20} testID="manual-add-another">
        <UserPlus size={15} color={ACCENT} />
        <Text style={styles.addAnotherText}>{rows.length >= 20 ? 'Maximum 20 entries' : '＋ Add Another'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function CsvTab({
  fileName,
  previewRows,
  error,
  onPickFile,
}: {
  fileName: string;
  previewRows: CsvPreviewRow[];
  error: string | null;
  onPickFile: () => void;
}) {
  const validCount = previewRows.filter((r) => r.status === 'valid').length;
  const invalidRows = previewRows.filter((r) => r.status === 'invalid');
  const duplicateRows = previewRows.filter((r) => r.status === 'skipped-duplicate');

  return (
    <View>
      <View style={styles.uploadZone}>
        <FileUp size={28} color={ACCENT} />
        <Text style={styles.uploadTitle}>Upload a CSV file</Text>
        <Text style={styles.uploadSubtitle}>Header row required: name, email, phone — up to 500 rows</Text>
        <TouchableOpacity onPress={onPickFile} activeOpacity={0.85} style={styles.chooseFileBtn} testID="csv-choose-file">
          <Text style={styles.chooseFileText}>Choose File</Text>
        </TouchableOpacity>
        {fileName.length > 0 && <Text style={styles.fileNameText}>📄 {fileName}</Text>}
        {error && (
          <View style={[styles.manualStatusErr, { marginTop: 8 }]}>
            <XCircle size={13} color={RED} />
            <Text style={styles.manualStatusErrText}>{error}</Text>
          </View>
        )}
      </View>

      {previewRows.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            ✅ {validCount} valid {validCount === 1 ? 'contact' : 'contacts'} ready to send
          </Text>
          {(invalidRows.length > 0 || duplicateRows.length > 0) && (
            <Text style={styles.summarySub}>
              {invalidRows.length > 0 ? `${invalidRows.length} invalid` : ''}
              {invalidRows.length > 0 && duplicateRows.length > 0 ? ' · ' : ''}
              {duplicateRows.length > 0 ? `${duplicateRows.length} duplicate` : ''}
            </Text>
          )}
          <View style={{ height: 8 }} />
          <Text style={styles.previewRowsTitle}>All rows</Text>
          {previewRows.map((r, i) => (
            <View key={i} style={styles.csvPreviewRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.previewRowName,
                    r.status !== 'valid' && styles.csvPreviewRowNameDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {r.name || '(no name)'}
                </Text>
                <Text style={styles.previewRowMeta} numberOfLines={1}>
                  {r.email || r.phone || ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.csvStatusBadge,
                  r.status === 'valid' && styles.csvStatusValid,
                  r.status === 'invalid' && styles.csvStatusInvalid,
                  r.status === 'skipped-duplicate' && styles.csvStatusDuplicate,
                ]}
              >
                {r.status === 'valid' ? 'Valid' : r.status === 'invalid' ? r.reason ?? 'Invalid' : r.reason ?? 'Duplicate'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SendResultsCard({ results }: { results: SendResultRow[] }) {
  const sentCount = results.filter((r) => r.status === 'sent').length;
  return (
    <View style={styles.resultsCard} testID="send-results-card">
      <Text style={styles.resultsTitle}>
        Last send: {sentCount} of {results.length} delivered
      </Text>
      {results.map((r, i) => (
        <View key={`${r.name}-${i}`} style={styles.resultsRow}>
          <Text style={styles.resultsRowName} numberOfLines={1}>
            {r.name}
          </Text>
          <Text
            style={[
              styles.csvStatusBadge,
              r.status === 'sent' && styles.csvStatusValid,
              r.status === 'error' && styles.csvStatusInvalid,
              r.status === 'duplicate' && styles.csvStatusDuplicate,
            ]}
          >
            {r.status === 'sent' ? 'Sent' : r.status === 'duplicate' ? 'Already invited' : `Failed${r.message ? `: ${r.message}` : ''}`}
          </Text>
        </View>
      ))}
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
  tabPillInactive: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: BORDER_SOFT },
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
  tabIntro: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 14, marginBottom: 4 },
  importPrompt: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 28,
    marginTop: 12,
  },
  importTitle: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 15, marginTop: 10 },
  importSubtitle: { color: MUTED, fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  importBtn: { marginTop: 16, backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999 },
  importBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
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
  selectAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  selectAllText: { color: ACCENT, fontWeight: '600' as const, fontSize: 13 },
  contactsHint: { color: MUTED, fontSize: 12 },
  contactsList: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, backgroundColor: '#fff', gap: 12 },
  contactRowActive: { backgroundColor: ACCENT_LIGHT },
  contactSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#EFEAF7', marginLeft: 72 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  contactName: { color: '#1A1A2E', fontWeight: '600' as const, fontSize: 14 },
  contactMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, alignItems: 'center' },
  contactMetaText: { color: '#888', fontSize: 12 },
  checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { color: MUTED, fontSize: 13 },
  rationale: { flexDirection: 'row', gap: 12, backgroundColor: '#EEF1FA', borderRadius: 12, padding: 12, marginTop: 12 },
  rationaleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  rationaleTitle: { fontSize: 13, fontWeight: '700' as const, color: '#1A1A2E' },
  rationaleBody: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },
  rationaleActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rationaleBtn: { backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rationaleBtnText: { color: '#FFFFFF', fontWeight: '700' as const, fontSize: 12 },
  rationaleBtnGhost: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: BORDER_SOFT },
  rationaleBtnGhostText: { color: '#1A1A2E', fontWeight: '700' as const, fontSize: 12 },
  manualRow: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#EFEAF7' },
  manualRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
  uploadZone: { borderWidth: 2, borderStyle: 'dashed', borderColor: ACCENT, borderRadius: 14, padding: 22, alignItems: 'center', backgroundColor: '#fff' },
  uploadTitle: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 14, marginTop: 8 },
  uploadSubtitle: { color: MUTED, fontSize: 12, marginTop: 4, textAlign: 'center' },
  chooseFileBtn: { marginTop: 12, backgroundColor: ACCENT, paddingVertical: 9, paddingHorizontal: 22, borderRadius: 999 },
  chooseFileText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
  fileNameText: { marginTop: 10, color: '#1A5C35', fontSize: 12 },
  summaryCard: { backgroundColor: '#E1F5EE', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#BDE7D7' },
  resultsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#EFEAF7' },
  resultsTitle: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 13, marginBottom: 8 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EFEAF7' },
  resultsRowName: { flex: 1, color: '#1A1A2E', fontSize: 13, fontWeight: '600' as const },
  summaryTitle: { color: GREEN, fontWeight: '700' as const, fontSize: 13 },
  summarySub: { color: '#0F6E56', fontSize: 11, marginTop: 2 },
  previewRowsTitle: { color: '#1A5C35', fontWeight: '600' as const, fontSize: 12, marginTop: 4 },
  csvPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BDE7D7',
  },
  csvPreviewRowNameDisabled: { color: MUTED, textDecorationLine: 'line-through' as const },
  csvStatusBadge: {
    fontSize: 10,
    fontWeight: '700' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center' as const,
    color: MUTED,
    backgroundColor: '#F0EFEA',
  },
  csvStatusValid: { color: GREEN, backgroundColor: '#D9F0E6' },
  csvStatusInvalid: { color: RED, backgroundColor: '#FCEBEB' },
  csvStatusDuplicate: { color: '#9A6B00', backgroundColor: '#FDF1D6' },
  previewRowName: { color: '#1A5C35', fontSize: 12, fontWeight: '600' as const, flex: 1 },
  previewRowMeta: { color: MUTED, fontSize: 11, marginTop: 1 },
  composerSection: { marginTop: 18, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8F5EE' },
  composerLabel: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 13, marginBottom: 6 },
  previewCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 4 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  previewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  previewAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
  previewBusinessName: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 14 },
  previewLine: { color: '#1A5C35', fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  previewBody: { color: '#1A5C35', fontSize: 13, lineHeight: 18 },
  previewFooter: { color: MUTED, fontSize: 11, marginTop: 6, fontStyle: 'italic' as const },
  bottomBar: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8F5EE', paddingHorizontal: 16, paddingTop: 10 },
  sendBtn: { borderRadius: 12 },
  sendBtnLabel: { fontWeight: '700' as const, fontSize: 14 },
  modalCard: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 16 },
  historyModalCard: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 16, maxHeight: '80%' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EFEAF7' },
  historyRowName: { color: '#1A1A2E', fontSize: 13, fontWeight: '600' as const },
  historyRowMeta: { color: MUTED, fontSize: 11, marginTop: 2 },
  historyStatusPending: { color: '#9A6B00', backgroundColor: '#FDF1D6' },
  modalTitle: { color: '#1A5C35', fontWeight: '700' as const, fontSize: 17, marginBottom: 8 },
  modalHeadline: { color: '#1A5C35', fontSize: 13, lineHeight: 18 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: ACCENT_LIGHT, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  totalLabel: { color: ACCENT, fontWeight: '700' as const, fontSize: 13 },
  totalValue: { color: ACCENT, fontWeight: '700' as const, fontSize: 14 },
  modalActions: { flexDirection: 'row', marginTop: 18 },
  phonePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EFEAF7', marginTop: 8, backgroundColor: '#fff' },
  phonePickerRowActive: { borderColor: ACCENT, backgroundColor: ACCENT_LIGHT },
  phonePickerText: { color: '#1A5C35', fontSize: 13, flex: 1 },
  phonePickerTextActive: { color: ACCENT, fontWeight: '700' as const },
});
