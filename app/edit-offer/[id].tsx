import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  TextInput,
  HelperText,
  Button,
  Dialog,
  Portal,
  Paragraph,
  Switch,
} from 'react-native-paper';
import { ArrowLeft, ImagePlus } from 'lucide-react-native';
import { DatePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { useOffer } from '@/hooks/useOffers';
import { updateOffer, uploadOfferImage, type Offer, type OfferType } from '@/api/services/offersService';
import { useSnackbar } from '@/contexts/SnackbarContext';

const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'discount', label: 'Discount' },
  { value: 'flash_sale', label: 'Flash Sale' },
];

async function toDisplayUri(uri: string): Promise<string> {
  if (!uri.startsWith('blob:') && !uri.startsWith('http')) return uri;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', uri);
    xhr.responseType = 'blob';
    xhr.send();
  });
}

registerTranslation('en', en);

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';
const TEXT_DARK = '#0F1115';
const TEXT_MUTED = '#6B7280';
const BORDER = '#ECECF1';
const DANGER = '#ED4956';

type Errors = Partial<Record<keyof Offer, string>>;

const validate = (d: Offer): Errors => {
  const e: Errors = {};
  if (!d.title.trim()) e.title = 'Offer title is required';
  else if (d.title.trim().length < 5) e.title = 'Title must be at least 5 characters';

  if (!d.description?.trim()) e.description = 'Description is required';
  else if ((d.description?.trim().length ?? 0) < 10) e.description = 'Description must be at least 10 characters';

  if (!d.starts_at) e.starts_at = 'Start date is required';
  if (!d.expires_at) e.expires_at = 'End date is required';
  if (d.starts_at && d.expires_at && d.expires_at <= d.starts_at)
    e.expires_at = 'End date must be after start date';

  return e;
};

export default function EditOfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { offer: original, loading: offerLoading } = useOffer(id ?? '');
  const { showSnackbar } = useSnackbar();

  const [draft, setDraft] = useState<Offer | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [discardVisible, setDiscardVisible] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [pickerField, setPickerField] = useState<'start' | 'end' | null>(null);
  const [tagsText, setTagsText] = useState<string>('');
  const [discountPercentText, setDiscountPercentText] = useState<string>('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (original && !draft) {
      setDraft({ ...original });
      setTagsText((original.tags ?? []).join(', '));
      setDiscountPercentText(original.discount_value != null ? String(original.discount_value) : '');
    }
  }, [original, draft]);

  const hasChanges = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(original) !== JSON.stringify(draft);
  }, [original, draft]);

  const set = <K extends keyof Offer>(key: K, value: Offer[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleChangePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const stable = await toDisplayUri(result.assets[0].uri);
      setLocalImageUri(stable);
      set('image_url', stable);
    }
  }, [set]);

  const handleRemovePhoto = useCallback(() => {
    setLocalImageUri(null);
    set('image_url', null);
  }, [set]);

  if (offerLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Offer</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.missing}>
          <ActivityIndicator color={PURPLE} />
        </View>
      </SafeAreaView>
    );
  }

  if (!draft || !original) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Offer</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Offer not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (hasChanges) setDiscardVisible(true);
    else router.back();
  };

  const handleSave = async () => {
    const errs = validate(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    try {
      setSaving(true);
      await updateOffer(draft.id, {
        title:           draft.title,
        description:     draft.description,
        starts_at:       draft.starts_at,
        expires_at:      draft.expires_at,
        terms:           draft.terms,
        max_redemptions: draft.max_redemptions ?? null,
        offer_type:      draft.offer_type,
        discount_type:   draft.offer_type === 'discount' ? 'percent' : null,
        discount_value:  draft.offer_type === 'discount' && discountPercentText ? parseInt(discountPercentText, 10) : null,
        original_price:  draft.original_price,
        tags:            tagsText.split(',').map((t) => t.trim()).filter(Boolean),
        is_hot:          draft.is_hot,
        promo_code:      draft.promo_code?.trim() || null,
        status:          draft.status === 'disabled' ? 'disabled' : 'active',
        // only send image_url when explicitly clearing it; new uploads go via uploadOfferImage
        ...(!localImageUri && { image_url: draft.image_url }),
      });
      if (localImageUri) await uploadOfferImage(draft.id, localImageUri);
      showSnackbar('Offer updated successfully');
      router.dismissTo('/content?tab=offers' as any);
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to update offer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="edit-offer-back">
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Offer</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving} testID="edit-offer-save">
          {saving
            ? <ActivityIndicator color={PURPLE} size="small" />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PhotoSection
            uri={draft.image_url}
            onChange={handleChangePhoto}
            onRemove={handleRemovePhoto}
          />

          <TextInput
            label="Offer Title *"
            value={draft.title}
            onChangeText={(v) => set('title', v.slice(0, 100))}
            mode="outlined"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Affix text={`${draft.title.length}/100`} />}
            error={!!errors.title}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.title}>{errors.title}</HelperText>

          <TextInput
            label="Description *"
            value={draft.description ?? ''}
            onChangeText={(v) => set('description', v.slice(0, 500) || null)}
            mode="outlined"
            multiline
            numberOfLines={4}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            error={!!errors.description}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.description}>{errors.description}</HelperText>
          <HelperText type="info">{(draft.description?.length ?? 0)} / 500</HelperText>

          <TouchableOpacity
            style={[styles.dateBtn, !!errors.starts_at && styles.dateBtnError]}
            onPress={() => setPickerField('start')}
            testID="offer-start-date"
            activeOpacity={0.7}
          >
            <Text style={styles.dateBtnLabel}>Valid From *</Text>
            <Text style={[styles.dateBtnValue, !draft.starts_at && styles.dateBtnPlaceholder]}>
              {draft.starts_at ? format(new Date(draft.starts_at), 'd MMM yyyy') : 'Select date'}
            </Text>
          </TouchableOpacity>
          <HelperText type="error" visible={!!errors.starts_at}>{errors.starts_at}</HelperText>

          <TouchableOpacity
            style={[styles.dateBtn, !!errors.expires_at && styles.dateBtnError]}
            onPress={() => setPickerField('end')}
            testID="offer-end-date"
            activeOpacity={0.7}
          >
            <Text style={styles.dateBtnLabel}>Valid Until *</Text>
            <Text style={[styles.dateBtnValue, !draft.expires_at && styles.dateBtnPlaceholder]}>
              {draft.expires_at ? format(new Date(draft.expires_at), 'd MMM yyyy') : 'Select date'}
            </Text>
          </TouchableOpacity>
          <HelperText type="error" visible={!!errors.expires_at}>{errors.expires_at}</HelperText>

          <TextInput
            label="Terms & Conditions (Optional)"
            value={draft.terms ?? ''}
            onChangeText={(v) => set('terms', v || null)}
            mode="outlined"
            multiline
            numberOfLines={3}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            style={styles.input}
          />

          <TextInput
            label="Max Redemptions (Optional)"
            value={draft.max_redemptions != null ? String(draft.max_redemptions) : ''}
            onChangeText={(v) => set('max_redemptions', v ? parseInt(v, 10) : null)}
            mode="outlined"
            keyboardType="numeric"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="account-group-outline" />}
            error={!!errors.max_redemptions}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.max_redemptions}>{errors.max_redemptions}</HelperText>

          <Text style={styles.sectionLabel}>Offer Type</Text>
          <View style={styles.typePillRow}>
            {OFFER_TYPES.map((item) => {
              const isSelected = draft.offer_type === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.typePill, isSelected && styles.typePillSelected]}
                  onPress={() => set('offer_type', item.value)}
                  activeOpacity={0.8}
                  testID={`edit-offer-type-${item.value}`}
                >
                  <Text style={[styles.typePillText, isSelected && styles.typePillTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {draft.offer_type === 'discount' && (
            <TextInput
              label="Discount %"
              value={discountPercentText}
              onChangeText={(v) => setDiscountPercentText(v.replace(/[^0-9]/g, '').slice(0, 3))}
              mode="outlined"
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              keyboardType="numeric"
              right={<TextInput.Affix text="%" />}
              style={styles.input}
              testID="edit-offer-discount-input"
            />
          )}

          <TextInput
            label="Original Price (Optional)"
            value={draft.original_price != null ? String(draft.original_price) : ''}
            onChangeText={(v) => set('original_price', v ? parseFloat(v.replace(/[^0-9.]/g, '')) : null)}
            mode="outlined"
            keyboardType="decimal-pad"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            left={<TextInput.Affix text="$" />}
            style={styles.input}
            testID="edit-offer-original-price-input"
          />

          <TextInput
            label="Tags (comma separated)"
            value={tagsText}
            onChangeText={setTagsText}
            mode="outlined"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            placeholder="Weekend, Members Only, Limited Time"
            style={styles.input}
            testID="edit-offer-tags-input"
          />

          <TextInput
            label="Promo Code (Optional)"
            value={draft.promo_code ?? ''}
            onChangeText={(v) => set('promo_code', v || null)}
            mode="outlined"
            autoCapitalize="characters"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            style={styles.input}
            testID="edit-offer-promo-code-input"
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mark as Hot</Text>
            <Switch value={draft.is_hot} onValueChange={(v) => set('is_hot', v)} color={PURPLE} testID="edit-offer-hot-toggle" />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {draft.effective_status === 'expired' ? 'Active (Expired)' : 'Active'}
            </Text>
            <Switch
              value={draft.status !== 'disabled'}
              disabled={draft.effective_status === 'expired'}
              onValueChange={(v) => set('status', v ? 'active' : 'disabled')}
              color={PURPLE}
              testID="edit-offer-active-toggle"
            />
          </View>
        </ScrollView>

        <DatePickerModal
          locale="en"
          mode="single"
          visible={pickerField !== null}
          onDismiss={() => setPickerField(null)}
          date={
            pickerField === 'start'
              ? (draft.starts_at ? new Date(draft.starts_at) : undefined)
              : (draft.expires_at ? new Date(draft.expires_at) : undefined)
          }
          onConfirm={({ date }) => {
            if (!date) { setPickerField(null); return; }
            const iso = date.toISOString();
            if (pickerField === 'start') {
              set('starts_at', iso);
            } else {
              set('expires_at', iso);
            }
            setPickerField(null);
          }}
          validRange={
            pickerField === 'end' && draft.starts_at
              ? { startDate: new Date(draft.starts_at) }
              : undefined
          }
        />
      </KeyboardAvoidingView>

      <Portal>
        <Dialog
          visible={discardVisible}
          onDismiss={() => setDiscardVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Discard changes?</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogBody}>
              You have unsaved changes. Are you sure you want to go back?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiscardVisible(false)} textColor={TEXT_MUTED}>
              Keep Editing
            </Button>
            <Button
              onPress={() => {
                setDiscardVisible(false);
                router.back();
              }}
              textColor={DANGER}
              testID="discard-confirm"
            >
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function PhotoSection({
  uri,
  onChange,
  onRemove,
}: {
  uri: string | null;
  onChange: () => void;
  onRemove: () => void;
}) {
  if (uri) {
    return (
      <View style={styles.photoWrap}>
        <Image source={{ uri }} style={styles.photo} />
        <View style={styles.photoActions}>
          <Button
            mode="outlined"
            icon="image-edit-outline"
            onPress={onChange}
            textColor={PURPLE}
            style={styles.photoBtn}
          >
            Change Photo
          </Button>
          <Button
            mode="outlined"
            icon="delete-outline"
            onPress={onRemove}
            textColor={DANGER}
            style={styles.photoBtn}
          >
            Remove
          </Button>
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={onChange} style={styles.photoPlaceholder} testID="add-photo">
      <ImagePlus size={32} color={TEXT_MUTED} />
      <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 56, height: 40, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 8 },
  saveBtn: { width: 56, height: 40, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 8 },
  saveText: { fontSize: 15, fontWeight: '700' as const, color: PURPLE },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: TEXT_DARK },
  scroll: { padding: 16, paddingBottom: 60, gap: 0 },
  input: { backgroundColor: '#fff' },
  photoWrap: { marginBottom: 16 },
  photo: { width: '100%', height: 200, borderRadius: 12, backgroundColor: BORDER },
  photoActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  photoBtn: { flex: 1, borderColor: BORDER },
  photoPlaceholder: {
    height: 160,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C4C4CC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  photoPlaceholderText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '500' as const },
  dialog: { backgroundColor: '#fff', borderRadius: 16 },
  dialogTitle: { fontSize: 17, fontWeight: '700' as const, color: TEXT_DARK },
  dialogBody: { fontSize: 14, color: TEXT_MUTED },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { color: TEXT_MUTED, fontSize: 14 },
  dateBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dateBtnError: { borderColor: DANGER },
  dateBtnLabel: { fontSize: 12, color: TEXT_MUTED, marginBottom: 2 },
  dateBtnValue: { fontSize: 16, color: TEXT_DARK },
  dateBtnPlaceholder: { color: '#C4C4CC' },
  sectionLabel: { fontSize: 12, fontWeight: '700' as const, color: TEXT_MUTED, marginTop: 8, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  typePillRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  typePillSelected: { backgroundColor: PURPLE, borderColor: PURPLE },
  typePillText: { fontSize: 13, fontWeight: '600' as const, color: TEXT_DARK },
  typePillTextSelected: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' as const, color: TEXT_DARK },
});
