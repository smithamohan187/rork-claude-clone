import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const PURPLE = '#1A5C35';

export default function TermsConditionsScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="terms-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Terms & Conditions</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Last updated: January 1, 2025</Text>

          <Text style={styles.heading}>1. Acceptance of Terms</Text>
          <Text style={styles.body}>
            By downloading, installing, or using the TouchPoint mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, do not use the App.
          </Text>

          <Text style={styles.heading}>2. Description of Service</Text>
          <Text style={styles.body}>
            TouchPoint is a loyalty and rewards platform that connects consumers with local businesses. Users can subscribe to businesses, earn points through purchases and referrals, and redeem rewards in the form of time-limited coupons.
          </Text>

          <Text style={styles.heading}>3. User Accounts</Text>
          <Text style={styles.body}>
            You must register for an account to use certain features of the App. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration and keep your account information up to date.
          </Text>

          <Text style={styles.heading}>4. Points and Rewards</Text>
          <Text style={styles.body}>
            Points are earned through eligible activities as defined by each participating business. Points have no cash value and cannot be transferred, sold, or exchanged for currency. TouchPoint reserves the right to modify point values, expiration policies, and redemption rules at any time. Coupons generated upon redemption are valid for 30 minutes from the time of confirmation.
          </Text>

          <Text style={styles.heading}>5. Referral Programme</Text>
          <Text style={styles.body}>
            Users may invite friends to join TouchPoint through the referral system. Referral points are credited only after the referred user completes their first qualifying purchase at the referring business. Abuse of the referral system, including creating multiple accounts, may result in account suspension.
          </Text>

          <Text style={styles.heading}>6. User Conduct</Text>
          <Text style={styles.body}>
            You agree not to: (a) use the App for any unlawful purpose; (b) attempt to gain unauthorised access to other user accounts or our systems; (c) interfere with or disrupt the App's functionality; (d) submit false or misleading information; (e) use automated means to access or interact with the App.
          </Text>

          <Text style={styles.heading}>7. Business Listings</Text>
          <Text style={styles.body}>
            TouchPoint does not guarantee the accuracy of business listings, promotions, or offers displayed in the App. Businesses are solely responsible for the content of their promotions and the fulfilment of their reward programmes.
          </Text>

          <Text style={styles.heading}>8. Intellectual Property</Text>
          <Text style={styles.body}>
            All content, features, and functionality of the App, including but not limited to text, graphics, logos, and software, are owned by TouchPoint and are protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our prior written consent.
          </Text>

          <Text style={styles.heading}>9. Limitation of Liability</Text>
          <Text style={styles.body}>
            TouchPoint is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App, including but not limited to loss of points, failed redemptions, or business closures.
          </Text>

          <Text style={styles.heading}>10. Termination</Text>
          <Text style={styles.body}>
            We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, all accumulated points and unused rewards will be forfeited.
          </Text>

          <Text style={styles.heading}>11. Changes to Terms</Text>
          <Text style={styles.body}>
            We reserve the right to modify these Terms at any time. Changes will be effective upon posting to the App. Your continued use of the App after changes constitutes acceptance of the updated Terms.
          </Text>

          <Text style={styles.heading}>12. Contact</Text>
          <Text style={styles.body}>
            If you have questions about these Terms, please contact us at legal@touchpoint.app or through the Help & Support section of the App.
          </Text>
        </View>
      </ScrollView>
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
  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#A0AABB',
    marginBottom: 16,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1B2A4A',
    marginTop: 18,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 20,
  },
});
