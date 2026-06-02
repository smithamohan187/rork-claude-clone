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

export default function PrivacyPolicyScreen() {
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
            testID="privacy-policy-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Privacy Policy</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.lastUpdated}>Last updated: January 1, 2025</Text>

          <Text style={styles.heading}>1. Introduction</Text>
          <Text style={styles.body}>
            TouchPoint ("we", "our", "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>

          <Text style={styles.heading}>2. Information We Collect</Text>
          <Text style={styles.body}>
            We collect information you provide directly, including: name, email address, phone number, date of birth, gender, profile photo, and interest preferences. We also collect usage data such as points earned, businesses subscribed to, redemption history, referral activity, and app interaction patterns.
          </Text>

          <Text style={styles.heading}>3. How We Use Your Information</Text>
          <Text style={styles.body}>
            We use your information to: (a) provide and maintain the App's features; (b) process point earning, redemptions, and rewards; (c) facilitate referral programmes; (d) personalise your experience and recommend businesses; (e) communicate with you about your account and offers; (f) improve and optimise the App; (g) detect and prevent fraud or abuse.
          </Text>

          <Text style={styles.heading}>4. Sharing Your Information</Text>
          <Text style={styles.body}>
            We may share your information with: participating businesses (limited profile data for loyalty and reward purposes), service providers who assist in operating the App, and as required by law. We do not sell your personal data to third parties.
          </Text>

          <Text style={styles.heading}>5. Data Retention</Text>
          <Text style={styles.body}>
            We retain your personal data for as long as your account is active or as needed to provide services. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.
          </Text>

          <Text style={styles.heading}>6. Data Security</Text>
          <Text style={styles.body}>
            We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. However, no method of electronic transmission or storage is 100% secure.
          </Text>

          <Text style={styles.heading}>7. Your Rights</Text>
          <Text style={styles.body}>
            You have the right to: access your personal data, correct inaccurate data, request deletion of your data, restrict or object to processing, request data portability, and withdraw consent at any time. You can exercise these rights through the Privacy & Security settings in the App or by contacting us directly.
          </Text>

          <Text style={styles.heading}>8. Cookies and Tracking</Text>
          <Text style={styles.body}>
            The App may use analytics tools to collect usage data for the purpose of improving performance and user experience. You can control tracking preferences through the Personalised Recommendations toggle in your Privacy settings.
          </Text>

          <Text style={styles.heading}>9. Children's Privacy</Text>
          <Text style={styles.body}>
            The App is not intended for use by individuals under the age of 16. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.
          </Text>

          <Text style={styles.heading}>10. Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy in the App. Your continued use of the App after changes constitutes acceptance of the updated policy.
          </Text>

          <Text style={styles.heading}>11. Contact Us</Text>
          <Text style={styles.body}>
            If you have questions or concerns about this Privacy Policy, please contact our Data Protection Officer at privacy@touchpoint.app or through the Help & Support section of the App.
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
