import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, TextInput, Button } from 'react-native-paper';
import {
  ArrowLeft,
  AlertTriangle,
  Coins,
  Ticket,
  Store,
  History,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';
const RED = '#ED4956';
const RED_DARK = '#DC2626';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState<string>('');

  const isDeleteEnabled = confirmText.trim() === 'DELETE';

  const handleDelete = useCallback(() => {
    if (!isDeleteEnabled) return;

    Alert.alert(
      'Final Confirmation',
      'This will permanently delete your account. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            console.log('[DeleteAccount] Account deletion confirmed');
            Alert.alert(
              'Account Deleted',
              'Your account has been permanently deleted.',
              [{ text: 'OK', onPress: () => router.replace('/') }]
            );
          },
        },
      ]
    );
  }, [isDeleteEnabled, router]);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="delete-account-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Delete Account</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.warningBanner}>
            <View style={styles.warningIconWrap}>
              <AlertTriangle size={32} color={RED} />
            </View>
            <Text style={styles.warningTitle}>Danger Zone</Text>
            <Text style={styles.warningSubtitle}>
              This action is permanent and cannot be undone
            </Text>
          </View>

          <Surface style={styles.infoCard} elevation={1}>
            <Text style={styles.infoTitle}>What will be deleted:</Text>

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: '#F59E0B' + '14' }]}>
                <Coins size={16} color="#F59E0B" />
              </View>
              <Text style={styles.infoText}>All your accumulated points</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: '#EC4899' + '14' }]}>
                <Ticket size={16} color="#EC4899" />
              </View>
              <Text style={styles.infoText}>All active and saved coupons</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: '#0D9488' + '14' }]}>
                <Store size={16} color="#0D9488" />
              </View>
              <Text style={styles.infoText}>Business subscriptions & memberships</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: '#00B246' + '14' }]}>
                <History size={16} color="#00B246" />
              </View>
              <Text style={styles.infoText}>Complete transaction & redemption history</Text>
            </View>
          </Surface>

          <Surface style={styles.warningCard} elevation={0}>
            <Text style={styles.warningCardText}>
              All your points, coupons, and subscription history will be deleted. This data cannot be recovered after account deletion.
            </Text>
          </Surface>

          <Surface style={styles.confirmCard} elevation={1}>
            <Text style={styles.confirmLabel}>
              Type <Text style={styles.confirmHighlight}>DELETE</Text> to confirm
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              mode="outlined"
              placeholder="Type DELETE here"
              style={styles.confirmInput}
              outlineColor="#D4D9E1"
              activeOutlineColor={RED}
              autoCapitalize="characters"
              testID="delete-account-confirm-input"
            />
          </Surface>

          <View style={styles.buttonSection}>
            <Button
              mode="contained"
              onPress={handleDelete}
              style={[styles.deleteButton, !isDeleteEnabled && styles.deleteButtonDisabled]}
              labelStyle={styles.deleteButtonLabel}
              contentStyle={styles.deleteButtonContent}
              buttonColor={RED_DARK}
              disabled={!isDeleteEnabled}
              icon={() => <AlertTriangle size={18} color={isDeleteEnabled ? '#fff' : '#ffffff80'} />}
              testID="delete-account-submit"
            >
              Permanently Delete Account
            </Button>

            <Button
              mode="text"
              onPress={() => router.back()}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonLabel}
              textColor="#6B7A8D"
              testID="delete-account-cancel"
            >
              Cancel and go back
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  headerBg: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: RED,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    paddingBottom: 50,
    paddingTop: 8,
  },
  warningBanner: {
    alignItems: 'center' as const,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 32,
  },
  warningIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: RED + '14',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 14,
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: RED,
    marginBottom: 6,
  },
  warningSubtitle: {
    fontSize: 14,
    color: '#6B7A8D',
    textAlign: 'center' as const,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1B2A4A',
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
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningCardText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 19,
    textAlign: 'center' as const,
  },
  confirmCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#1B2A4A',
    fontWeight: '500' as const,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  confirmHighlight: {
    fontWeight: '800' as const,
    color: RED,
    letterSpacing: 1,
  },
  confirmInput: {
    backgroundColor: '#fff',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  buttonSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  deleteButton: {
    borderRadius: 14,
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  deleteButtonContent: {
    paddingVertical: 6,
  },
  cancelButton: {
    marginTop: 4,
  },
  cancelButtonLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
