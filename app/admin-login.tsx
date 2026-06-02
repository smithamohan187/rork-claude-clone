import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const ADMIN_CREDENTIALS = {
  email: 'admin@touchpoint.com',
  password: 'TP@dmin2026!',
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000;

export default function AdminLoginScreen() {
  const router = useRouter();
  const { loginAsAdmin } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const isLocked = useCallback(() => {
    if (!lockedUntil) return false;
    if (Date.now() < lockedUntil) return true;
    setLockedUntil(null);
    setAttempts(0);
    return false;
  }, [lockedUntil]);

  const handleLogin = useCallback(async () => {
    if (isLocked()) {
      const remaining = Math.ceil(((lockedUntil ?? 0) - Date.now()) / 1000);
      setError(`Account locked. Try again in ${remaining}s`);
      triggerShake();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 800));

    const emailMatch = email.trim().toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
    const passwordMatch = password === ADMIN_CREDENTIALS.password;

    if (emailMatch && passwordMatch) {
      console.log('[AdminLogin] Successful admin authentication');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setAttempts(0);
      await loginAsAdmin();
      setIsLoading(false);
      router.replace('/admin-dashboard' as any);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      console.log(`[AdminLogin] Failed attempt ${newAttempts}/${MAX_ATTEMPTS}`);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
        setError(`Too many failed attempts. Locked for 60 seconds.`);
      } else {
        setError(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }

      triggerShake();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsLoading(false);
    }
  }, [email, password, attempts, lockedUntil, isLocked, triggerShake, loginAsAdmin, router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              testID="admin-login-back"
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <View style={styles.shieldOuter}>
                <View style={styles.shieldInner}>
                  <Shield size={32} color="#fff" />
                </View>
              </View>
            </View>

            <Text style={styles.title}>Admin Access</Text>
            <Text style={styles.subtitle}>
              Authorized personnel only. Enter your admin credentials to continue.
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                    <Mail size={18} color={Colors.navyLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="admin@touchpoint.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      testID="admin-email-input"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                    <Lock size={18} color={Colors.navyLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(''); }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      testID="admin-password-input"
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="rgba(255,255,255,0.5)" />
                      ) : (
                        <Eye size={18} color="rgba(255,255,255,0.5)" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
                  onPress={handleLogin}
                  activeOpacity={0.8}
                  disabled={isLoading}
                  testID="admin-login-submit"
                >
                  {isLoading ? (
                    <Text style={styles.loginBtnText}>Verifying...</Text>
                  ) : (
                    <Text style={styles.loginBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.securityNote}>
              <Lock size={12} color="rgba(255,255,255,0.35)" />
              <Text style={styles.securityText}>
                This session is encrypted and monitored
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1826',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: -40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
    letterSpacing: 0.1,
  },
  form: {
    marginTop: 32,
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: 'rgba(237,73,86,0.5)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  loginBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
  },
  securityText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.2,
  },
});

