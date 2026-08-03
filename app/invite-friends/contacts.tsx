import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Share2,
  ChevronRight,
  Users,
  ShieldCheck,
  Search,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useInviteFriends } from '@/hooks/useInviteFriends';
import type { DeviceContact } from '@/api/services/contactsService';

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

export default function InviteContactsScreen() {
  const router = useRouter();
  const inv = useInviteFriends();

  useEffect(() => {
    // Never auto-request contacts permission on mount — only in response to a user action.
  }, []);

  const denied = inv.contactsPermission.status === 'denied';

  const renderItem = ({ item }: { item: DeviceContact }) => {
    const subtitle = item.phones[0] ?? item.emails[0] ?? '';
    return (
      <View style={styles.row} testID={`invite-row-${item.id}`}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFor(item.name)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => inv.shareToContact(item)}
          style={styles.inviteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container} testID="invite-contacts-screen">
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="invite-close"
          >
            <X size={22} color={Colors.bannerText} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <TouchableOpacity
          style={styles.shareLinkRow}
          onPress={inv.copyLink}
          activeOpacity={0.85}
          disabled={!inv.referral}
          testID="copy-invite-link"
        >
          <View style={styles.shareIconCircle}>
            <Share2 size={20} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.shareLinkTitle}>Copy my referral link</Text>
            <Text style={styles.shareLinkSub} numberOfLines={1}>
              {inv.referralLoading ? 'Loading…' : inv.referral?.url ?? ''}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        {inv.deviceContacts.length === 0 && !inv.contactsLoading && (
          <View style={styles.rationale}>
            <View style={styles.rationaleIcon}>
              <ShieldCheck size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rationaleTitle}>
                {denied ? 'Contacts access disabled' : 'Import your contacts'}
              </Text>
              <Text style={styles.rationaleBody}>
                {denied
                  ? 'Enable Contacts in Settings to invite friends from your address book.'
                  : 'Grant contacts access to see your address book here, or just share your link above.'}
              </Text>
              <View style={styles.rationaleActions}>
                {denied ? (
                  <TouchableOpacity
                    onPress={() => { try { (Linking as any).openSettings?.(); } catch {} }}
                    style={styles.rationaleBtn}
                  >
                    <Text style={styles.rationaleBtnText}>Open Settings</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={inv.importContacts} style={styles.rationaleBtn}>
                    <Text style={styles.rationaleBtnText}>Import Contacts</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {inv.deviceContacts.length > 0 && (
          <>
            <View style={styles.searchWrap}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                value={inv.contactsSearch}
                onChangeText={inv.setContactsSearch}
                placeholder="Search contacts by name, phone, or email..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                autoCapitalize="none"
                testID="invite-contacts-search"
              />
            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Users size={14} color={Colors.navyDark} />
                <Text style={styles.sectionTitle}>INVITE TO TOUCHPOINTS</Text>
              </View>
            </View>
          </>
        )}

        {inv.contactsLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
        ) : inv.deviceContacts.length > 0 && inv.filteredContacts.length === 0 ? (
          <View style={styles.noMatch}>
            <Text style={styles.noMatchText}>
              No contacts match &quot;{inv.contactsSearch.trim()}&quot;
            </Text>
          </View>
        ) : (
          <FlatList
            data={inv.filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            testID="invite-contacts-list"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.navyDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.navyDark,
  },
  headerTitle: {
    color: Colors.bannerText,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  shareLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  shareIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00B246',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  shareLinkSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rationale: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EEF1FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  rationaleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rationaleTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  rationaleBody: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  rationaleActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rationaleBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rationaleBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    padding: 0,
  },
  noMatch: {
    paddingTop: 32,
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 64 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1A5C35',
  },
  inviteBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
