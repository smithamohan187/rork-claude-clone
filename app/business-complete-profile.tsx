import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, ImagePlus, MapPin, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useCompleteBusinessProfile } from '@/hooks/useCompleteBusinessProfile';

export default function BusinessCompleteProfileScreen() {
  const router = useRouter();
  const {
    businessType, setBusinessType,
    description, setDescription,
    phone, setPhone,
    website, setWebsite,
    address, setAddress,
    city, setCity,
    state, setState,
    country, setCountry,
    detecting, detectError, detectLocation,
    photoUri, pickPhoto,
    loadingInitial, saving, error,
    handleSave,
  } = useCompleteBusinessProfile();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finish your business profile</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {loadingInitial ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.introText}>
              A few more details help customers find and trust your business. This unlocks posting offers, events, and inviting customers once combined with starting your Stripe trial.
            </Text>

            <Text style={styles.sectionLabel}>BUSINESS TYPE</Text>
            <View style={styles.typeCardList}>
              {(['goodwill', 'incentivised'] as const).map((t) => {
                const selected = businessType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeCard, selected && styles.typeCardSelected]}
                    onPress={() => setBusinessType(t)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.typeCardHeader}>
                      <Text style={[styles.typeCardTitle, selected && styles.typeCardTitleSelected]}>
                        {t === 'goodwill' ? 'Goodwill' : 'Incentivised Referrals'}
                      </Text>
                      <View style={[styles.typeCardRadio, selected && styles.typeCardRadioSelected]}>
                        {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </View>
                    </View>
                    <Text style={styles.typeCardDesc}>
                      {t === 'goodwill'
                        ? 'Post offers and events and build loyalty through genuine connection — no points or rewards system.'
                        : 'Reward customers with points, tiers, and a redeemable rewards catalog to drive repeat visits.'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>PHOTOS</Text>
            <View style={styles.uploadSection}>
              <View style={styles.inputLabelRow}>
                <ImagePlus size={16} color={Colors.textSecondary} />
                <Text style={styles.inputLabel}>Business Photo</Text>
              </View>
              {photoUri ? (
                <View style={styles.uploadedLogoWrap}>
                  <Image source={{ uri: photoUri }} style={styles.uploadedLogo} contentFit="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={pickPhoto} activeOpacity={0.7}>
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadLogoBox} onPress={pickPhoto} activeOpacity={0.7}>
                  <Camera size={22} color={Colors.textSecondary} />
                  <Text style={styles.uploadPhotoText}>Tap to upload a photo</Text>
                  <Text style={styles.uploadPhotoSubtext}>Used as your business's logo and cover photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionLabel}>ABOUT</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Tell customers what makes your business special"
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <Text style={styles.sectionLabel}>CONTACT</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 555 123 4567"
                placeholderTextColor={Colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="https://yourbusiness.com"
                placeholderTextColor={Colors.textTertiary}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.locationHeaderRow}>
              <Text style={styles.sectionLabel}>LOCATION</Text>
              <TouchableOpacity
                style={styles.detectLocationBtn}
                onPress={detectLocation}
                activeOpacity={0.7}
                disabled={detecting}
              >
                {detecting ? (
                  <ActivityIndicator size="small" color={Colors.primaryDark} />
                ) : (
                  <MapPin size={14} color={Colors.primaryDark} />
                )}
                <Text style={styles.detectLocationText}>
                  {detecting ? 'Detecting…' : 'Detect my location'}
                </Text>
              </TouchableOpacity>
            </View>
            {!!detectError && (
              <Text style={styles.detectErrorText}>{detectError}</Text>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Street address"
                placeholderTextColor={Colors.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor={Colors.textTertiary} />
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput style={styles.input} value={state} onChangeText={setState} placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Country</Text>
              <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholderTextColor={Colors.textTertiary} />
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.9}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save & Continue</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, flex: 1, textAlign: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 48 },
  introText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700' as const, color: Colors.textTertiary,
    letterSpacing: 1, marginBottom: 10, marginTop: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  typeCardList: { gap: 10, marginBottom: 8 },
  typeCard: {
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  typeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeCardTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.textSecondary },
  typeCardTitleSelected: { color: Colors.primaryDark },
  typeCardRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  typeCardRadioSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  typeCardDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, lineHeight: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: Colors.text,
  },
  multiline: { height: 96, paddingTop: 12, textAlignVertical: 'top' },
  errorBox: { backgroundColor: '#FCEAEA', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: Colors.error, fontSize: 13 },
  locationHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 4,
  },
  detectLocationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 4, paddingHorizontal: 4,
  },
  detectLocationText: { fontSize: 12, fontWeight: '600' as const, color: Colors.primaryDark },
  detectErrorText: { fontSize: 12, color: Colors.error, marginBottom: 10 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  uploadSection: { marginBottom: 18 },
  uploadLogoBox: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPhotoText: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary },
  uploadPhotoSubtext: { fontSize: 11, color: Colors.textTertiary },
  uploadedLogoWrap: { position: 'relative', alignSelf: 'flex-start' },
  uploadedLogo: { width: 120, height: 120, borderRadius: 14 },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.primaryDark, height: 52, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' as const },
});
