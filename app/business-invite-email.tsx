import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Eye, Send, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';
import { buildBusinessReferralLink } from '@/components/feed/BusinessInviteBanner';

const PURPLE = '#00B246';
const ORANGE = '#1A5C35';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BusinessInviteEmailScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const params = useLocalSearchParams<{ referralLink?: string }>();
  const referralLink = params.referralLink ?? buildBusinessReferralLink(currentUser?.id);

  const defaultBody = useMemo(
    () =>
      `Hi there,\n\nI'd like to invite you to join TouchPoint — a platform that helps businesses connect with customers through offers, events, and a rewards system.\n\nLooking forward to seeing your business on the platform!`,
    [],
  );

  const [emailInput, setEmailInput] = useState<string>('');
  const [emails, setEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>(
    'Join me on TouchPoint — Grow your business with loyal customers',
  );
  const [body, setBody] = useState<string>(defaultBody);

  const previewBody = useMemo(
    () => `${body.trim()}\n\nCreate your free business profile here:\n${referralLink}`,
    [body, referralLink],
  );

  const addEmailFromInput = useCallback(() => {
    const v = emailInput.trim().replace(/[,;]$/, '');
    if (!v) return;
    if (!EMAIL_RE.test(v)) {
      showSnackbar('Enter a valid email address');
      return;
    }
    if (emails.includes(v)) {
      setEmailInput('');
      return;
    }
    setEmails((prev) => [...prev, v]);
    setEmailInput('');
  }, [emailInput, emails, showSnackbar]);

  const removeEmail = useCallback((email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  }, []);

  const handleEmailChange = useCallback(
    (text: string) => {
      if (text.endsWith(' ') || text.endsWith(',') || text.endsWith(';')) {
        const v = text.replace(/[\s,;]+$/, '').trim();
        if (v && EMAIL_RE.test(v) && !emails.includes(v)) {
          setEmails((prev) => [...prev, v]);
          setEmailInput('');
          return;
        }
      }
      setEmailInput(text);
    },
    [emails],
  );

  const goExplore = useCallback(() => {
    router.replace('/(tabs)/marketplace');
  }, [router]);

  const handleSend = useCallback(async () => {
    const allEmails = [...emails];
    const pending = emailInput.trim();
    if (pending && EMAIL_RE.test(pending) && !allEmails.includes(pending)) {
      allEmails.push(pending);
    }
    if (allEmails.length === 0) {
      showSnackbar('Add at least one email');
      return;
    }
    try {
      const mod: typeof import('expo-mail-composer') | null = await import('expo-mail-composer').catch(
        () => null as unknown as typeof import('expo-mail-composer'),
      );
      let sent = false;
      if (mod && Platform.OS !== 'web') {
        const available = await mod.isAvailableAsync();
        if (available) {
          await mod.composeAsync({ recipients: allEmails, subject, body: previewBody });
          sent = true;
        }
      }
      if (!sent) {
        const url = `mailto:${allEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(previewBody)}`;
        const supported = await Linking.canOpenURL(url).catch(() => false);
        if (supported) {
          await Linking.openURL(url);
          sent = true;
        }
      }
      if (!sent) {
        await Clipboard.setStringAsync(`${subject}\n\n${previewBody}`);
        showSnackbar('Email copied to clipboard');
      } else {
        showSnackbar("🎉 Invites sent! You'll earn points when they join TouchPoint.");
      }
      goExplore();
    } catch (e) {
      console.log('[BizInviteEmail] send error', e);
      showSnackbar('Could not open email');
    }
  }, [emails, emailInput, subject, previewBody, goExplore, showSnackbar]);

  const sendCount = emails.length + (emailInput.trim() && EMAIL_RE.test(emailInput.trim()) ? 1 : 0);
  const canSend = sendCount > 0;

  return (
    <View style={styles.container} testID="biz-invite-email-screen">
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <ArrowLeft size={20} color={Colors.bannerText} />
          </Pressable>
          <Text style={styles.headerTitle}>Invite via Email</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>TO</Text>
          <View style={styles.tagBox}>
            <View style={styles.tagsRow}>
              {emails.map((e) => (
                <View key={e} style={styles.tag}>
                  <Text style={styles.tagText}>{e}</Text>
                  <Pressable onPress={() => removeEmail(e)} hitSlop={8}>
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
              <TextInput
                value={emailInput}
                onChangeText={handleEmailChange}
                onSubmitEditing={addEmailFromInput}
                onBlur={addEmailFromInput}
                placeholder={emails.length === 0 ? 'Enter email addresses…' : 'Add another…'}
                placeholderTextColor="#9aa0b3"
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.tagInput}
              />
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>SUBJECT</Text>
          <TextInput
            mode="outlined"
            value={subject}
            onChangeText={setSubject}
            outlineColor={PURPLE}
            activeOutlineColor={PURPLE}
            style={styles.input}
          />

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>MESSAGE</Text>
          <TextInput
            mode="outlined"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            outlineColor={PURPLE}
            activeOutlineColor={PURPLE}
            style={styles.input}
          />

          <View style={styles.previewHead}>
            <Text style={styles.sectionLabel}>PREVIEW</Text>
            <Eye size={13} color="#9aa0b3" />
          </View>
          <View style={styles.previewCard}>
            <View style={styles.previewBorder} />
            <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12 }}>
              <Text style={styles.previewSubject} numberOfLines={2}>
                {subject}
              </Text>
              <Text style={styles.previewBody}>{body.trim()}</Text>
              <Text style={styles.previewLink} numberOfLines={2}>
                Create your free business profile here:{'\n'}
                {referralLink}
              </Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            testID="biz-email-send"
          >
            <Send size={18} color="#fff" />
            <Text style={styles.sendBtnText}>Send Email</Text>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  headerTitle: { color: Colors.bannerText, fontSize: 17, fontWeight: '700' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#9aa0b3',
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  tagBox: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    minHeight: 56,
    padding: 8,
    justifyContent: 'center',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PURPLE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tagInput: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'transparent',
    height: 36,
    fontSize: 14,
    paddingHorizontal: 0,
  },
  input: { backgroundColor: Colors.surface, fontSize: 14 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 8 },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  previewBorder: { width: 4, backgroundColor: PURPLE, marginRight: 12 },
  previewSubject: { fontSize: 14, fontWeight: '800', color: '#1A5C35', marginBottom: 6 },
  previewBody: { fontSize: 13, color: '#1A5C35', lineHeight: 20 },
  previewLink: { fontSize: 12, color: '#9aa0b3', marginTop: 10, lineHeight: 17 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E8F5EE',
  },
  sendBtn: {
    flexDirection: 'row',
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
