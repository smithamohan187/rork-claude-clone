import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Chip,
  Surface,
  Snackbar,
} from 'react-native-paper';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useEditProfile } from '@/hooks/useEditProfile';

const PURPLE      = '#1A5C35';
const PURPLE_LIGHT = '#00B246';
const PURPLE_MUTED = '#E8F5EE';
const BG          = '#F6F5FA';

export default function MyProfileScreen() {
  const router = useRouter();

  const {
    fullName,   setFullName,
    phone,      setPhone,
    bio,        setBio,
    country,    state,  city,
    onCountryChange,  onCountrySelect,  countrySuggestions,
    onStateChange,    onStateSelect,    stateSuggestions,
    onCityChange,     onCitySelect,     citySuggestions,
    interests,
    selectedInterestIds,
    toggleInterest,
    avatarUri,
    uploadingAvatar,
    pickAndUploadAvatar,
    loading,
    saving,
    error,
    success,
    setSuccess,
    handleSave,
  } = useEditProfile();

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.headerBg} />
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
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
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="my-profile-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveBtn}
            activeOpacity={0.7}
            disabled={saving}
            testID="my-profile-save-header"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Avatar ── */}
      <View style={styles.avatarWrap}>
        <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} testID="avatar-picker">
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>
                {fullName ? fullName[0].toUpperCase() : '?'}
              </Text>
            )}
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.cameraIcon}>
            <Camera size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Personal Information ── */}
          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionLabel}>Personal Information</Text>

            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              style={styles.input}
              outlineColor="#D4D9E1"
              activeOutlineColor={PURPLE}
              testID="my-profile-name"
            />

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              outlineColor="#D4D9E1"
              activeOutlineColor={PURPLE}
              keyboardType="phone-pad"
              testID="my-profile-phone"
            />

            <TextInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              mode="outlined"
              style={styles.input}
              outlineColor="#D4D9E1"
              activeOutlineColor={PURPLE}
              multiline
              numberOfLines={3}
              testID="my-profile-bio"
            />
          </Surface>

          {/* ── Location ── */}
          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionLabel}>Location</Text>

            <View style={styles.autocompleteWrap}>
              <TextInput
                label="Country"
                value={country}
                onChangeText={onCountryChange}
                mode="outlined"
                style={styles.input}
                outlineColor="#D4D9E1"
                activeOutlineColor={PURPLE}
                testID="my-profile-country"
              />
              {countrySuggestions.length > 0 && (
                <View style={styles.suggestionsBox} testID="country-suggestions">
                  {countrySuggestions.map((c) => (
                    <TouchableOpacity
                      key={c.isoCode}
                      style={styles.suggestionRow}
                      onPress={() => onCountrySelect(c)}
                      testID={`country-suggestion-${c.isoCode}`}
                    >
                      <Text style={styles.suggestionText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.autocompleteWrap}>
              <TextInput
                label="State"
                value={state}
                onChangeText={onStateChange}
                mode="outlined"
                style={styles.input}
                outlineColor="#D4D9E1"
                activeOutlineColor={PURPLE}
                testID="my-profile-state"
              />
              {stateSuggestions.length > 0 && (
                <View style={styles.suggestionsBox} testID="state-suggestions">
                  {stateSuggestions.map((s) => (
                    <TouchableOpacity
                      key={s.isoCode}
                      style={styles.suggestionRow}
                      onPress={() => onStateSelect(s)}
                      testID={`state-suggestion-${s.isoCode}`}
                    >
                      <Text style={styles.suggestionText}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.autocompleteWrap}>
              <TextInput
                label="City"
                value={city}
                onChangeText={onCityChange}
                mode="outlined"
                style={styles.input}
                outlineColor="#D4D9E1"
                activeOutlineColor={PURPLE}
                testID="my-profile-city"
              />
              {citySuggestions.length > 0 && (
                <View style={styles.suggestionsBox} testID="city-suggestions">
                  {citySuggestions.map((c) => (
                    <TouchableOpacity
                      key={c.name}
                      style={styles.suggestionRow}
                      onPress={() => onCitySelect(c)}
                      testID={`city-suggestion-${c.name}`}
                    >
                      <Text style={styles.suggestionText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Surface>

          {/* ── Interests ── */}
          <Surface style={styles.formCard} elevation={1}>
            <Text style={styles.sectionLabel}>Areas of Interest</Text>
            <Text style={styles.sectionHint}>Select topics you're interested in</Text>
            <View style={styles.chipGrid}>
              {interests.map((interest) => {
                const selected = selectedInterestIds.includes(interest.id);
                return (
                  <Chip
                    key={interest.id}
                    selected={selected}
                    onPress={() => toggleInterest(interest.id)}
                    mode={selected ? 'flat' : 'outlined'}
                    style={[styles.chip, selected && styles.chipSelected]}
                    textStyle={[styles.chipText, selected && styles.chipTextSelected]}
                    selectedColor={selected ? '#fff' : '#1B2A4A'}
                    showSelectedOverlay={false}
                    testID={`interest-chip-${interest.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {interest.name}
                  </Chip>
                );
              })}
            </View>
          </Surface>

          {/* ── Error + Save ── */}
          <View style={styles.saveSection}>
            {!!error && (
              <Text style={styles.errorText} testID="my-profile-error">
                {error}
              </Text>
            )}
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.saveButton}
              labelStyle={styles.saveButtonLabel}
              contentStyle={styles.saveButtonContent}
              buttonColor={PURPLE}
              loading={saving}
              disabled={saving}
              testID="my-profile-save"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={success}
        onDismiss={() => setSuccess(false)}
        duration={3000}
        style={styles.snackbar}
        testID="my-profile-success-snackbar"
      >
        Profile updated successfully!
      </Snackbar>
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
    paddingTop: 16,
    paddingBottom: 50,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  autocompleteWrap: {
    position: 'relative' as const,
  },
  suggestionsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: -10,
    marginBottom: 12,
    overflow: 'hidden' as const,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1B2A4A',
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
  errorText: {
    fontSize: 13,
    color: '#ED4956',
    textAlign: 'center' as const,
    marginBottom: 12,
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
  snackbar: {
    backgroundColor: '#1B2A4A',
  },
  avatarWrap: {
    alignItems: 'center' as const,
    marginTop: 12,
    marginBottom: 8,
    zIndex: 5,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: PURPLE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cameraIcon: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
