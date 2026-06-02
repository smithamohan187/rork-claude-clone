import React, { useState, useCallback, useMemo } from 'react';
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
import { TextInput, Button, Surface, ProgressBar } from 'react-native-paper';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';

type StrengthLevel = 'none' | 'weak' | 'fair' | 'strong';

function getPasswordStrength(password: string): { level: StrengthLevel; progress: number; color: string; label: string } {
  if (!password) return { level: 'none', progress: 0, color: '#D4D9E1', label: '' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', progress: 0.33, color: '#EF4444', label: 'Weak' };
  if (score <= 3) return { level: 'fair', progress: 0.66, color: '#F59E0B', label: 'Fair' };
  return { level: 'strong', progress: 1, color: '#22C55E', label: 'Strong' };
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  const handleUpdate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.current = 'Current password is required';
    }
    if (newPassword.length < 6) {
      newErrors.new = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }
    if (currentPassword === newPassword && currentPassword.length > 0) {
      newErrors.new = 'New password must be different from current';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[ChangePassword] Password updated successfully');
    Alert.alert('Password Updated', 'Your password has been changed successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [currentPassword, newPassword, confirmPassword, router]);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="change-password-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Change Password</Text>
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
          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionLabel}>Update Your Password</Text>
            <Text style={styles.sectionHint}>
              Choose a strong password with a mix of letters, numbers, and symbols.
            </Text>

            <View style={styles.inputWrap}>
              <TextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={(t) => {
                  setCurrentPassword(t);
                  if (errors.current) setErrors(prev => ({ ...prev, current: '' }));
                }}
                mode="outlined"
                style={styles.input}
                outlineColor="#D4D9E1"
                activeOutlineColor={PURPLE}
                secureTextEntry={!showCurrent}
                error={!!errors.current}
                right={
                  <TextInput.Icon
                    icon={() =>
                      showCurrent
                        ? <EyeOff size={20} color="#6B7A8D" />
                        : <Eye size={20} color="#6B7A8D" />
                    }
                    onPress={() => setShowCurrent(!showCurrent)}
                  />
                }
                testID="change-password-current"
              />
              {!!errors.current && <Text style={styles.errorText}>{errors.current}</Text>}
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  if (errors.new) setErrors(prev => ({ ...prev, new: '' }));
                }}
                mode="outlined"
                style={styles.input}
                outlineColor="#D4D9E1"
                activeOutlineColor={PURPLE}
                secureTextEntry={!showNew}
                error={!!errors.new}
                right={
                  <TextInput.Icon
                    icon={() =>
                      showNew
                        ? <EyeOff size={20} color="#6B7A8D" />
                        : <Eye size={20} color="#6B7A8D" />
                    }
                    onPress={() => setShowNew(!showNew)}
                  />
                }
                testID="change-password-new"
              />
              {!!errors.new && <Text style={styles.errorText}>{errors.new}</Text>}
            </View>

            {newPassword.length > 0 && (
              <View style={styles.strengthSection}>
                <View style={styles.strengthBarWrap}>
                  <ProgressBar
                    progress={strength.progress}
                    color={strength.color}
                    style={styles.strengthBar}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}

            <View style={styles.inputWrap}>
              <TextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (errors.confirm) setErrors(prev => ({ ...prev, confirm: '' }));
                }}
                mode="outlined"
                style={styles.input}
                outlineColor="#D4D9E1"
                activeOutlineColor={PURPLE}
                secureTextEntry={!showConfirm}
                error={!!errors.confirm}
                right={
                  <TextInput.Icon
                    icon={() =>
                      showConfirm
                        ? <EyeOff size={20} color="#6B7A8D" />
                        : <Eye size={20} color="#6B7A8D" />
                    }
                    onPress={() => setShowConfirm(!showConfirm)}
                  />
                }
                testID="change-password-confirm"
              />
              {!!errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}
            </View>
          </Surface>

          <View style={styles.buttonSection}>
            <Button
              mode="contained"
              onPress={handleUpdate}
              style={[styles.updateButton, !canSubmit && styles.updateButtonDisabled]}
              labelStyle={styles.updateButtonLabel}
              contentStyle={styles.updateButtonContent}
              buttonColor={PURPLE}
              disabled={!canSubmit}
              testID="change-password-submit"
            >
              Update Password
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
    paddingBottom: 50,
    paddingTop: 8,
  },
  formCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#6B7A8D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6B7A8D',
    marginBottom: 18,
    lineHeight: 18,
  },
  inputWrap: {
    marginBottom: 4,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    color: '#ED4956',
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },
  strengthSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 14,
    marginTop: -2,
    gap: 10,
  },
  strengthBarWrap: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden' as const,
    backgroundColor: '#EDEDF0',
  },
  strengthBar: {
    height: 6,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    minWidth: 48,
    textAlign: 'right' as const,
  },
  buttonSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  updateButton: {
    borderRadius: 14,
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  updateButtonLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  updateButtonContent: {
    paddingVertical: 6,
  },
});
