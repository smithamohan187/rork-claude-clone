import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput, FAB } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Mail, Send, Check, FlaskConical, Pencil, Eye } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { InviteContact } from './contacts';

const APP_LINK = 'https://apps.apple.com/app/touchpoint';

export default function InviteReviewScreen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const params = useLocalSearchParams<{
    contacts?: string;
    referralCode?: string;
    referralLink?: string;
  }>();

  const contacts = useMemo<InviteContact[]>(() => {
    try {
      return params.contacts ? (JSON.parse(params.contacts) as InviteContact[]) : [];
    } catch {
      return [];
    }
  }, [params.contacts]);

  const referralLink = params.referralLink ?? 'https://touchpoint.app/join?ref=YOU-A3M9';
  const [draft, setDraft] = useState<string>('Invitation to join TouchPoint');
  const [sending, setSending] = useState<boolean>(false);
  const [hasFocused, setHasFocused] = useState<boolean>(false);

  const previewBody = useMemo(() => {
    return `${draft.trim()}\n\nYou're invited to join TouchPoint — discover businesses, earn rewards, and get exclusive offers. Download here:\n${APP_LINK}`;
  }, [draft]);

  const fullMessage = useMemo(() => `${previewBody}\n\nMy referral link: ${referralLink}`, [
    previewBody,
    referralLink,
  ]);

  const handleSend = useCallback(async () => {
    if (contacts.length === 0 || sending) return;
    setSending(true);
    const phones = contacts.map((c) => c.phone).filter(Boolean);
    try {
      const smsMod: typeof import('expo-sms') | null = await import('expo-sms').catch(
        () => null as unknown as typeof import('expo-sms'),
      );
      let sentViaSms = false;
      if (smsMod && Platform.OS !== 'web') {
        const available = await smsMod.isAvailableAsync();
        if (available) {
          await smsMod.sendSMSAsync(phones, fullMessage);
          sentViaSms = true;
        }
      }
      if (!sentViaSms) {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          const sep = Platform.OS === 'ios' ? '&' : '?';
          const url = `sms:${phones.join(',')}${sep}body=${encodeURIComponent(fullMessage)}`;
          const supported = await Linking.canOpenURL(url).catch(() => false);
          if (supported) {
            await Linking.openURL(url);
            sentViaSms = true;
          }
        }
      }
      if (!sentViaSms) {
        await Clipboard.setStringAsync(fullMessage);
        showSnackbar('Message copied — share it with your friends');
      } else {
        showSnackbar('Invites sent! 🎉');
      }
      router.replace('/(tabs)/feed');
    } catch (err) {
      console.log('[InviteReview] send error', err);
      await Clipboard.setStringAsync(fullMessage);
      showSnackbar('Message copied to clipboard');
      router.replace('/(tabs)/feed');
    } finally {
      setSending(false);
    }
  }, [contacts, sending, fullMessage, router, showSnackbar]);

  return (
    <View style={styles.container} testID="invite-review-screen">
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="invite-back"
          >
            <ArrowLeft size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Message</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <View style={styles.stepperWrap}>
        <View style={styles.stepItem}>
          <View style={[styles.stepDot, styles.stepDotDone]}>
            <Check size={12} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelDone]}>Contacts</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Message</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.draftCard}>
            <View style={styles.draftIconCircle}>
              <Mail size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.draftTitle}>Draft Invitation</Text>
            <Text style={styles.draftSub}>To {contacts.length} contact{contacts.length === 1 ? '' : 's'}</Text>
          </View>

          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>MESSAGE</Text>
            <Pencil size={12} color="#00B246" />
          </View>
          <TextInput
            mode="outlined"
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setHasFocused(true)}
            multiline
            numberOfLines={3}
            placeholder="Tap to personalise your message…"
            outlineColor="#00B246"
            activeOutlineColor="#00B246"
            style={styles.input}
            testID="invite-message-input"
          />
          {!hasFocused && (
            <Text style={styles.helperHint}>✏️ Tap the message to edit before sending</Text>
          )}

          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>PREVIEW</Text>
            <Eye size={13} color={Colors.textSecondary} />
          </View>
          <View style={styles.previewCard}>
            <View style={styles.previewBorder} />
            <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12 }}>
              <Text style={styles.previewBody}>{previewBody}</Text>
              <Text style={styles.previewLink} numberOfLines={2}>
                My referral link: {referralLink}
              </Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || contacts.length === 0}
            style={[
              styles.sendBtn,
              (sending || contacts.length === 0) && styles.sendBtnDisabled,
            ]}
            activeOpacity={0.9}
            testID="invite-send"
          >
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.sendBtnText}>
              Send {contacts.length} Invite{contacts.length === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <FAB
        icon={() => <FlaskConical size={22} color="#FFFFFF" />}
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => {}}
        testID="invite-fab"
      />
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
  headerTitle: { color: Colors.bannerText, fontSize: 18, fontWeight: '700' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  stepDotDone: { backgroundColor: '#00B246', borderColor: '#00B246' },
  stepDotActive: { borderColor: '#00B246', backgroundColor: Colors.surface },
  stepLine: { width: 60, height: 2, backgroundColor: '#00B246' },
  stepLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  stepLabelDone: { color: '#00B246' },
  stepLabelActive: { color: '#00B246', fontWeight: '700' },
  draftCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  draftIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A5C35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  draftTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  draftSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 8,
  },
  helperHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  input: { backgroundColor: Colors.surface, fontSize: 14 },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  previewBorder: { width: 4, backgroundColor: '#00B246', marginRight: 12 },
  previewBody: { fontSize: 13, color: Colors.text, lineHeight: 20 },
  previewLink: { fontSize: 12, color: Colors.textTertiary, marginTop: 10 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  sendBtn: {
    flexDirection: 'row',
    backgroundColor: '#1A5C35',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sendBtnDisabled: { backgroundColor: Colors.textTertiary, opacity: 0.6 },
  sendBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: Colors.accent,
    borderRadius: 28,
  },
});
