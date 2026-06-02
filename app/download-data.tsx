import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Button } from 'react-native-paper';
import {
  ArrowLeft,
  Download,
  FileText,
  Mail,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';

export default function DownloadDataScreen() {
  const router = useRouter();
  const [requested, setRequested] = useState<boolean>(false);

  const handleRequestExport = useCallback(() => {
    Alert.alert(
      'Request Data Export',
      'We will prepare a copy of your personal data and send it to your registered email address. This may take up to 48 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setRequested(true);
            console.log('[DownloadData] Data export requested');
          },
        },
      ]
    );
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
            testID="download-data-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Download My Data</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Download size={36} color={PURPLE} />
          </View>
          <Text style={styles.heroTitle}>Your Data, Your Right</Text>
          <Text style={styles.heroDesc}>
            Request a complete copy of all your personal data stored in TouchPoint.
          </Text>
        </View>

        <Surface style={styles.infoCard} elevation={1}>
          <Text style={styles.infoSectionTitle}>What's included</Text>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: '#3B82F6' + '14' }]}>
              <FileText size={16} color="#3B82F6" />
            </View>
            <Text style={styles.infoText}>Profile information & preferences</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: '#F59E0B' + '14' }]}>
              <FileText size={16} color="#F59E0B" />
            </View>
            <Text style={styles.infoText}>Points history & reward redemptions</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: '#22C55E' + '14' }]}>
              <FileText size={16} color="#22C55E" />
            </View>
            <Text style={styles.infoText}>Business subscriptions & activity</Text>
          </View>
        </Surface>

        <Surface style={styles.noteCard} elevation={1}>
          <View style={styles.noteRow}>
            <Mail size={18} color="#6B7A8D" />
            <Text style={styles.noteText}>
              You will receive an email with your data within 48 hours.
            </Text>
          </View>
          <View style={styles.noteRow}>
            <Clock size={18} color="#6B7A8D" />
            <Text style={styles.noteText}>
              The download link in the email will expire after 7 days.
            </Text>
          </View>
        </Surface>

        {requested ? (
          <Surface style={styles.successCard} elevation={1}>
            <CheckCircle2 size={28} color="#22C55E" />
            <Text style={styles.successTitle}>Export Requested</Text>
            <Text style={styles.successDesc}>
              We're preparing your data. Check your email within 48 hours for the download link.
            </Text>
          </Surface>
        ) : (
          <View style={styles.buttonSection}>
            <Button
              mode="contained"
              onPress={handleRequestExport}
              style={styles.exportButton}
              labelStyle={styles.exportButtonLabel}
              contentStyle={styles.exportButtonContent}
              buttonColor={PURPLE}
              icon={() => <Download size={18} color="#fff" />}
              testID="request-data-export"
            >
              Request Data Export
            </Button>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
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
  heroSection: {
    alignItems: 'center' as const,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 32,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PURPLE + '14',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1B2A4A',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: '#6B7A8D',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#6B7A8D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    gap: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  infoText: {
    fontSize: 14,
    color: '#1B2A4A',
    fontWeight: '500' as const,
    flex: 1,
  },
  noteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  noteRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#6B7A8D',
    flex: 1,
    lineHeight: 18,
  },
  successCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center' as const,
    gap: 8,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#065F46',
  },
  successDesc: {
    fontSize: 13,
    color: '#047857',
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  buttonSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  exportButton: {
    borderRadius: 14,
  },
  exportButtonLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  exportButtonContent: {
    paddingVertical: 6,
  },
  bottomSpacer: {
    height: 20,
  },
});
