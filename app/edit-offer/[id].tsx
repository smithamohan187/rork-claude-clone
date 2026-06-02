import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  TextInput,
  HelperText,
  Button,
  Dialog,
  Portal,
  Paragraph,
} from 'react-native-paper';
import { ArrowLeft, ImagePlus } from 'lucide-react-native';
import { useManageContent, type OfferItem } from '@/contexts/ManageContentContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';
const TEXT_DARK = '#0F1115';
const TEXT_MUTED = '#6B7280';
const BORDER = '#ECECF1';
const DANGER = '#ED4956';

type Errors = Partial<Record<keyof OfferItem, string>>;

const validate = (d: OfferItem): Errors => {
  const e: Errors = {};
  if (!d.title.trim()) e.title = 'Offer title is required';
  else if (d.title.trim().length < 5) e.title = 'Title must be at least 5 characters';

  if (!d.description.trim()) e.description = 'Description is required';
  else if (d.description.trim().length < 10) e.description = 'Description must be at least 10 characters';

  if (!d.offer_value.trim()) e.offer_value = 'Offer value is required';

  if (!d.valid_from) e.valid_from = 'Start date is required';
  if (!d.valid_until) e.valid_until = 'End date is required';
  if (d.valid_from && d.valid_until && d.valid_until <= d.valid_from)
    e.valid_until = 'End date must be after start date';

  if (d.max_redemptions && isNaN(Number(d.max_redemptions)))
    e.max_redemptions = 'Must be a valid number';

  return e;
};

export default function EditOfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getOffer, updateOffer } = useManageContent();
  const { showSnackbar } = useSnackbar();
  const original = id ? getOffer(id) : undefined;

  const [draft, setDraft] = useState<OfferItem | null>(original ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [discardVisible, setDiscardVisible] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (original && !draft) setDraft({ ...original });
  }, [original, draft]);

  const hasChanges = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(original) !== JSON.stringify(draft);
  }, [original, draft]);

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

  const handleSave = () => {
    const errs = validate(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    updateOffer(draft.id, draft);
    showSnackbar('Offer updated successfully');
    router.back();
  };

  const set = <K extends keyof OfferItem>(key: K, value: OfferItem[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleChangePhoto = () => set('image_url', `https://picsum.photos/seed/${draft.id}_edit_${Date.now()}/600/400`);
  const handleRemovePhoto = () => set('image_url', null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="edit-offer-back">
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Offer</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} testID="edit-offer-save">
          <Text style={styles.saveText}>Save</Text>
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
            value={draft.description}
            onChangeText={(v) => set('description', v.slice(0, 500))}
            mode="outlined"
            multiline
            numberOfLines={4}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            error={!!errors.description}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.description}>{errors.description}</HelperText>
          <HelperText type="info">{draft.description.length} / 500</HelperText>

          <TextInput
            label="Offer Value (e.g. 20% off, Buy 1 Get 1) *"
            value={draft.offer_value}
            onChangeText={(v) => set('offer_value', v)}
            mode="outlined"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            error={!!errors.offer_value}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.offer_value}>{errors.offer_value}</HelperText>

          <TextInput
            label="Valid From *"
            value={draft.valid_from}
            onChangeText={(v) => set('valid_from', v)}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="calendar" />}
            error={!!errors.valid_from}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.valid_from}>{errors.valid_from}</HelperText>

          <TextInput
            label="Valid Until *"
            value={draft.valid_until}
            onChangeText={(v) => set('valid_until', v)}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="calendar" />}
            error={!!errors.valid_until}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.valid_until}>{errors.valid_until}</HelperText>

          <TextInput
            label="Terms & Conditions (Optional)"
            value={draft.terms}
            onChangeText={(v) => set('terms', v)}
            mode="outlined"
            multiline
            numberOfLines={3}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            style={styles.input}
          />

          <TextInput
            label="Max Redemptions (Optional)"
            value={draft.max_redemptions}
            onChangeText={(v) => set('max_redemptions', v)}
            mode="outlined"
            keyboardType="numeric"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="account-group-outline" />}
            error={!!errors.max_redemptions}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.max_redemptions}>{errors.max_redemptions}</HelperText>
        </ScrollView>
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
});
