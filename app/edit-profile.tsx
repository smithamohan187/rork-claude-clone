import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Chip,
  SegmentedButtons,
  Dialog,
  Portal,
  Surface,
} from 'react-native-paper';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/services/authService';
import { getUserById, updateUser } from '@/services/userService';
import {
  getDefaultProfile,
  updateDefaultProfile,
} from '@/services/profileService';
import { uploadAvatar } from '@/services/storageService';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#00B246';
const PURPLE_SURFACE = '#F3F0FF';
const PURPLE_MUTED = '#E8F5EE';
const BG = '#F6F5FA';

type GenderValue = 'male' | 'female' | 'prefer_not_to_say';

const INTEREST_OPTIONS = [
  'Food',
  'Retail',
  'Fitness',
  'Beauty',
  'Travel',
  'Entertainment',
] as const;

const GENDER_BUTTONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { personalUser } = useAuth();

  const initialDob = '15 March 1992';
  const initialGender: GenderValue = 'male';
  const initialInterests = ['Food', 'Fitness', 'Travel'];

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [dob, setDob] = useState<string>(initialDob);
  const [gender, setGender] = useState<GenderValue>(initialGender);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [showDiscardDialog, setShowDiscardDialog] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const [initialName, setInitialName] = useState<string>('');
  const [initialEmail, setInitialEmail] = useState<string>('');
  const [initialPhone, setInitialPhone] = useState<string>('');
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);

  const isEmailVerified = true;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data: userData, error: sessionErr } = await getCurrentUser();
        if (sessionErr) throw new Error(sessionErr.message);
        const uid = userData?.id;
        if (!uid) throw new Error('Not signed in');
        if (!isMounted) return;
        setAuthUserId(uid);

        const [userRes, profileRes] = await Promise.all([
          getUserById(uid),
          getDefaultProfile(uid),
        ]);

        if (userRes.error) console.log('[EditProfile] users fetch error', userRes.error);
        if (profileRes.error) console.log('[EditProfile] profiles fetch error', profileRes.error);

        if (!isMounted) return;

        const u = userRes.data;
        const p = profileRes.data;

        const nm = u?.full_name ?? personalUser.name ?? '';
        const em = u?.email ?? personalUser.email ?? '';
        const ph = u?.phone ?? personalUser.phone ?? '';
        const av = p?.avatar_url ?? null;
        const dn = p?.display_name ?? nm;

        setFullName(nm);
        setEmail(em);
        setPhone(ph);
        setAvatarUrl(av);
        setDisplayAvatarUrl(av ? `${av}?t=${Date.now()}` : null);
        setDisplayName(dn);
        setProfileId(p?.id ?? null);

        setInitialName(nm);
        setInitialEmail(em);
        setInitialPhone(ph);
        setInitialAvatar(av);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load profile';
        console.log('[EditProfile] load error', msg);
        Alert.alert('Error', msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [personalUser.name, personalUser.email, personalUser.phone]);

  const hasChanges = useMemo(() => {
    return (
      fullName !== initialName ||
      email !== initialEmail ||
      phone !== initialPhone ||
      avatarUrl !== initialAvatar ||
      dob !== initialDob ||
      gender !== initialGender ||
      JSON.stringify([...interests].sort()) !== JSON.stringify([...initialInterests].sort())
    );
  }, [fullName, email, phone, avatarUrl, dob, gender, interests, initialName, initialEmail, initialPhone, initialAvatar]);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      router.back();
    }
  }, [hasChanges, router]);

  const toggleInterest = useCallback((interest: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }, []);

  const validate = useCallback((): boolean => {
    let valid = true;
    if (!fullName.trim()) {
      setNameError('Name is required');
      valid = false;
    } else {
      setNameError('');
    }
    if (!validateEmail(email)) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }
    return valid;
  }, [fullName, email]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!authUserId) {
      Alert.alert('Error', 'You are not signed in.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newDisplayName = displayName.trim().length > 0 ? displayName : fullName;
      const [userRes, profileRes] = await Promise.all([
        updateUser(authUserId, { full_name: fullName, phone, updated_at: now }),
        updateDefaultProfile(authUserId, {
          display_name: newDisplayName,
          avatar_url: avatarUrl,
          updated_at: now,
        }),
      ]);
      if (userRes.error) throw new Error(userRes.error.message);
      if (profileRes.error) throw new Error(profileRes.error.message);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[EditProfile] Saved:', { fullName, phone, avatarUrl });
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile';
      console.log('[EditProfile] save error', msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [saving, validate, authUserId, fullName, phone, displayName, avatarUrl, router]);

  const handleChangePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!authUserId) {
      Alert.alert('Error', 'You are not signed in.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo access to change your avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);

      let body: ArrayBuffer | Blob;

      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri);
        body = await resp.blob();
      } else {
        const resp = await fetch(asset.uri);
        body = await resp.arrayBuffer();
      }

      const { data: uploadData, error: uploadErr } = await uploadAvatar(
        authUserId,
        body,
      );

      if (uploadErr || !uploadData) {
        console.log('[EditProfile] avatar upload error', uploadErr?.message);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        return;
      }

      const publicUrl = uploadData.publicUrl;
      const displayUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('[EditProfile] Auth user id:', authUserId);
      console.log('[EditProfile] Upload complete, URL:', publicUrl);

      const { error: updateErr } = await updateDefaultProfile(authUserId, {
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      console.log('[EditProfile] Profile update result:', updateErr);

      if (updateErr) {
        console.log('[EditProfile] profile update error', updateErr.message);
        Alert.alert('Error', 'Image uploaded but profile not updated. Please try again.');
        return;
      }

      setAvatarUrl(publicUrl);
      setDisplayAvatarUrl(displayUrl);
      setInitialAvatar(publicUrl);
      console.log('[EditProfile] Avatar uploaded:', publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.log('[EditProfile] avatar error', msg);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [authUserId]);

  const initials = (fullName || personalUser.name || '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.headerBg} />
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Edit Profile</Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="edit-profile-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveBtn}
            activeOpacity={0.7}
            disabled={saving}
            testID="edit-profile-save-header"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
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
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuter}>
              {displayAvatarUrl ? (
                <Image
                  key={displayAvatarUrl}
                  source={{ uri: displayAvatarUrl }}
                  style={styles.avatarImage}
                  cachePolicy="none"
                  testID="edit-profile-avatar"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraOverlay}
                onPress={handleChangePhoto}
                activeOpacity={0.7}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.7} disabled={uploadingAvatar}>
              <Text style={styles.changePhotoText}>
                {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionLabel}>Personal Information</Text>

            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                if (nameError) setNameError('');
              }}
              mode="outlined"
              style={styles.input}
              outlineColor="#D4D9E1"
              activeOutlineColor={PURPLE}
              error={!!nameError}
              testID="edit-profile-name"
            />
            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

            <View style={styles.emailRow}>
              <View style={styles.emailInputWrap}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (emailError) setEmailError('');
                  }}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#D4D9E1"
                  activeOutlineColor={PURPLE}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={!!emailError}
                  editable={false}
                  testID="edit-profile-email"
                />
              </View>
              {isEmailVerified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={18} color="#22C55E" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              outlineColor="#D4D9E1"
              activeOutlineColor={PURPLE}
              keyboardType="phone-pad"
              testID="edit-profile-phone"
            />

            <TextInput
              label="Date of Birth"
              value={dob}
              onChangeText={setDob}
              mode="outlined"
              style={styles.input}
              outlineColor="#D4D9E1"
              activeOutlineColor={PURPLE}
              placeholder="DD Month YYYY"
              testID="edit-profile-dob"
            />

            <Text style={[styles.sectionLabel, styles.genderLabel]}>Gender</Text>
            <SegmentedButtons
              value={gender}
              onValueChange={(v) => setGender(v as GenderValue)}
              buttons={GENDER_BUTTONS}
              style={styles.segmented}
              theme={{
                colors: {
                  secondaryContainer: PURPLE_MUTED,
                  onSecondaryContainer: PURPLE,
                  outline: '#D4D9E1',
                },
              }}
              testID="edit-profile-gender"
            />
          </Surface>

          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionLabel}>Interests</Text>
            <Text style={styles.sectionHint}>Select topics you're interested in</Text>
            <View style={styles.chipGrid}>
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <Chip
                    key={interest}
                    selected={selected}
                    onPress={() => toggleInterest(interest)}
                    mode={selected ? 'flat' : 'outlined'}
                    style={[
                      styles.chip,
                      selected && styles.chipSelected,
                    ]}
                    textStyle={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                    selectedColor={selected ? '#fff' : '#1B2A4A'}
                    showSelectedOverlay={false}
                    testID={`interest-chip-${interest.toLowerCase()}`}
                  >
                    {interest}
                  </Chip>
                );
              })}
            </View>
          </Surface>

          <View style={styles.saveSection}>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.saveButton}
              labelStyle={styles.saveButtonLabel}
              contentStyle={styles.saveButtonContent}
              buttonColor={PURPLE}
              loading={saving}
              disabled={saving}
              testID="edit-profile-save"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog
          visible={showDiscardDialog}
          onDismiss={() => setShowDiscardDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Discard changes?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>
              You have unsaved changes. Are you sure you want to go back? Your edits will be lost.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setShowDiscardDialog(false)}
              textColor={PURPLE}
              testID="discard-keep-editing"
            >
              Keep Editing
            </Button>
            <Button
              onPress={() => {
                setShowDiscardDialog(false);
                router.back();
              }}
              textColor="#ED4956"
              testID="discard-confirm"
            >
              Discard
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
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 50,
  },
  avatarSection: {
    alignItems: 'center' as const,
    paddingTop: 8,
    paddingBottom: 20,
  },
  avatarOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    padding: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: PURPLE_SURFACE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: PURPLE,
  },
  cameraOverlay: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PURPLE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: PURPLE_LIGHT,
    marginTop: 10,
  },
  formCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#6B7A8D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6B7A8D',
    marginTop: -6,
    marginBottom: 14,
  },
  genderLabel: {
    marginTop: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  emailRow: {
    position: 'relative' as const,
  },
  emailInputWrap: {
    flex: 1,
  },
  verifiedBadge: {
    position: 'absolute' as const,
    right: 8,
    top: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  errorText: {
    fontSize: 12,
    color: '#ED4956',
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  segmented: {
    marginBottom: 4,
  },
  chipGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  chip: {
    borderRadius: 20,
    borderColor: '#D4D9E1',
  },
  chipSelected: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1B2A4A',
  },
  chipTextSelected: {
    color: '#fff',
  },
  saveSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 14,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
  dialog: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B2A4A',
  },
  dialogBody: {
    fontSize: 14,
    color: '#6B7A8D',
    lineHeight: 20,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
