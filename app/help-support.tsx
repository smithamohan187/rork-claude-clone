import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Searchbar, Divider, Dialog, Portal, Button } from 'react-native-paper';
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Info,
  FileText,
  Lock,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    id: 'earn_points',
    question: 'How do I earn points?',
    answer: 'You earn points by subscribing to a business, referring friends after they make a purchase, and sharing offers. Each business sets their own point values.',
  },
  {
    id: 'redeem_points',
    question: 'How do I redeem my points?',
    answer: 'Go to your Rewards Dashboard, choose a business, tap Redeem, and confirm when you are at the store. A 30-minute coupon will be generated.',
  },
  {
    id: 'coupon_expired',
    question: 'Why did my coupon expire?',
    answer: 'Coupons are valid for 30 minutes from the moment you confirm redemption. Make sure you are at the store before redeeming.',
  },
  {
    id: 'referral_system',
    question: 'How does the referral system work?',
    answer: 'Visit a Business Profile you are subscribed to and tap "Invite a Friend". Points are credited to both of you only after your friend makes their first purchase at that business.',
  },
  {
    id: 'change_subscription',
    question: 'How do I change my subscription to a business?',
    answer: 'Go to the Business Profile and tap "Subscribed" to unsubscribe. You can re-subscribe at any time.',
  },
  {
    id: 'points_missing',
    question: 'My points are not showing. What do I do?',
    answer: 'Points may take a few minutes to reflect. If the issue persists, contact our support team.',
  },
];

const QUICK_HELP = [
  { id: 'chat', label: 'Chat with Us', icon: MessageCircle, color: '#3B82F6' },
  { id: 'email', label: 'Email Support', icon: Mail, color: '#0D9488' },
  { id: 'call', label: 'Call Us', icon: Phone, color: '#F59E0B' },
];

function AccordionItem({ faq, isExpanded, onToggle }: { faq: FAQ; isExpanded: boolean; onToggle: () => void }) {
  const animatedHeight = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animatedHeight]);

  const maxHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150],
  });

  const rotate = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View>
      <TouchableOpacity
        style={styles.faqRow}
        onPress={onToggle}
        activeOpacity={0.7}
        testID={`faq-${faq.id}`}
      >
        <Text style={styles.faqQuestion}>{faq.question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={18} color="#6B7A8D" />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={{ maxHeight, overflow: 'hidden' as const }}>
        <View style={styles.faqAnswerWrap}>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCallDialog, setShowCallDialog] = useState<boolean>(false);

  const filteredFaqs = searchQuery.trim().length > 0
    ? FAQS.filter(
        f =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQS;

  const toggleFaq = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(prev => (prev === id ? null : id));
    console.log('[HelpSupport] Toggle FAQ:', id);
  }, []);

  const handleQuickHelp = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (id === 'chat') {
      console.log('[HelpSupport] Opening chat with support');
      router.push('/chat/support' as any);
    } else if (id === 'email') {
      console.log('[HelpSupport] Opening email composer');
      Linking.openURL('mailto:support@touchpoint.app?subject=Help%20Request');
    } else if (id === 'call') {
      setShowCallDialog(true);
    }
  }, [router]);

  const handleCall = useCallback(() => {
    setShowCallDialog(false);
    console.log('[HelpSupport] Calling support');
    if (Platform.OS !== 'web') {
      Linking.openURL('tel:+18001234567');
    }
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="help-support-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Help & Support</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchWrap}>
          <Searchbar
            placeholder="Search for help..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            iconColor="#6B7A8D"
            placeholderTextColor="#A0AABB"
            testID="help-searchbar"
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Help</Text>
        <View style={styles.quickHelpRow}>
          {QUICK_HELP.map(item => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.quickCard}
                onPress={() => handleQuickHelp(item.id)}
                activeOpacity={0.7}
                testID={`quick-help-${item.id}`}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: item.color + '14' }]}>
                  <Icon size={22} color={item.color} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyFaq}>
              <Text style={styles.emptyFaqText}>No results found for "{searchQuery}"</Text>
            </View>
          ) : (
            filteredFaqs.map((faq, idx) => (
              <React.Fragment key={faq.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <AccordionItem
                  faq={faq}
                  isExpanded={expandedId === faq.id}
                  onToggle={() => toggleFaq(faq.id)}
                />
              </React.Fragment>
            ))
          )}
        </Surface>

        <Text style={styles.sectionTitle}>App Info</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <View style={styles.listRow}>
            <View style={[styles.iconWrap, { backgroundColor: '#6B7A8D' + '14' }]}>
              <Info size={18} color="#6B7A8D" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>App Version</Text>
              <Text style={styles.listDesc}>1.0.0</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/terms-conditions' as any)}
            activeOpacity={0.7}
            testID="help-terms"
          >
            <View style={[styles.iconWrap, { backgroundColor: PURPLE + '14' }]}>
              <FileText size={18} color={PURPLE} />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Terms & Conditions</Text>
              <Text style={styles.listDesc}>Read our terms of service</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/privacy-policy' as any)}
            activeOpacity={0.7}
            testID="help-privacy-policy"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#0D9488' + '14' }]}>
              <Lock size={18} color="#0D9488" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Privacy Policy</Text>
              <Text style={styles.listDesc}>How we handle your data</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.listRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              console.log('[HelpSupport] Rate the app');
            }}
            activeOpacity={0.7}
            testID="help-rate-app"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#F59E0B' + '14' }]}>
              <Star size={18} color="#F59E0B" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Rate the App</Text>
              <Text style={styles.listDesc}>Love TouchPoint? Leave us a review</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>
        </Surface>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={showCallDialog}
          onDismiss={() => setShowCallDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="phone" color={PURPLE} size={32} />
          <Dialog.Title style={styles.dialogTitle}>Call Support</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>
              Reach our support team at
            </Text>
            <Text style={styles.dialogPhone}>+1 (800) 123-4567</Text>
            <Text style={styles.dialogBody}>
              Available Mon–Fri, 9 AM – 6 PM EST
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setShowCallDialog(false)}
              textColor="#6B7A8D"
              testID="call-dialog-cancel"
            >
              Close
            </Button>
            <Button
              onPress={handleCall}
              textColor={PURPLE}
              testID="call-dialog-call"
            >
              Call Now
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F5FA',
  },
  headerBg: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: PURPLE,
  },
  safeTop: {
    zIndex: 10,
  },
  navRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  searchbar: {
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  searchInput: {
    fontSize: 14,
    color: '#1B2A4A',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#6B7A8D',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  quickHelpRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#E8F5EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1B2A4A',
    textAlign: 'center' as const,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden' as const,
  },
  faqRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B2A4A',
    marginRight: 8,
    lineHeight: 20,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7A8D',
    lineHeight: 20,
  },
  emptyFaq: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
  },
  emptyFaqText: {
    fontSize: 14,
    color: '#A0AABB',
    textAlign: 'center' as const,
  },
  listRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  listTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B2A4A',
    marginBottom: 2,
  },
  listDesc: {
    fontSize: 12,
    color: '#6B7A8D',
    lineHeight: 16,
  },
  divider: {
    marginHorizontal: 16,
    backgroundColor: '#F0EDF5',
  },
  bottomSpacer: {
    height: 20,
  },
  dialog: {
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  dialogTitle: {
    textAlign: 'center' as const,
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B2A4A',
  },
  dialogBody: {
    fontSize: 14,
    color: '#6B7A8D',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  dialogPhone: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: PURPLE,
    textAlign: 'center' as const,
    marginVertical: 8,
  },
  dialogActions: {
    justifyContent: 'center' as const,
    paddingBottom: 8,
  },
});
