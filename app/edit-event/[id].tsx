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
import { useManageContent, type EventItem } from '@/contexts/ManageContentContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';
const TEXT_DARK = '#0F1115';
const TEXT_MUTED = '#6B7280';
const BORDER = '#ECECF1';
const DANGER = '#ED4956';

type Errors = Partial<Record<keyof EventItem, string>>;

const validate = (d: EventItem): Errors => {
  const e: Errors = {};
  if (!d.title.trim()) e.title = 'Event name is required';
  else if (d.title.trim().length < 5) e.title = 'Name must be at least 5 characters';

  if (!d.description.trim()) e.description = 'Description is required';
  else if (d.description.trim().length < 10) e.description = 'Description must be at least 10 characters';

  if (!d.date) {
    e.date = 'Event date is required';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dt = new Date(d.date);
    if (!isNaN(dt.getTime()) && dt < today) e.date = 'Event date cannot be in the past';
  }

  if (!d.start_time.trim()) e.start_time = 'Start time is required';
  if (!d.location.trim()) e.location = 'Venue or location is required';

  if (d.capacity && isNaN(Number(d.capacity))) e.capacity = 'Capacity must be a valid number';

  return e;
};

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getEvent, updateEvent } = useManageContent();
  const { showSnackbar } = useSnackbar();
  const original = id ? getEvent(id) : undefined;

  const [draft, setDraft] = useState<EventItem | null>(original ?? null);
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
          <Text style={styles.headerTitle}>Edit Event</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Event not found.</Text>
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
    updateEvent(draft.id, draft);
    showSnackbar('Event updated successfully');
    router.back();
  };

  const set = <K extends keyof EventItem>(key: K, value: EventItem[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleChangePhoto = () =>
    set('image_url', `https://picsum.photos/seed/${draft.id}_edit_${Date.now()}/600/400`);
  const handleRemovePhoto = () => set('image_url', null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="edit-event-back">
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} testID="edit-event-save">
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PhotoSection uri={draft.image_url} onChange={handleChangePhoto} onRemove={handleRemovePhoto} />

          <TextInput
            label="Event Name *"
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
            label="Event Date *"
            value={draft.date}
            onChangeText={(v) => set('date', v)}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="calendar" />}
            error={!!errors.date}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.date}>{errors.date}</HelperText>

          <TextInput
            label="Start Time *"
            value={draft.start_time}
            onChangeText={(v) => set('start_time', v)}
            mode="outlined"
            placeholder="e.g. 07:00 PM"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="clock-outline" />}
            error={!!errors.start_time}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.start_time}>{errors.start_time}</HelperText>

          <TextInput
            label="End Time (Optional)"
            value={draft.end_time}
            onChangeText={(v) => set('end_time', v)}
            mode="outlined"
            placeholder="e.g. 09:00 PM"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="clock-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Venue / Location *"
            value={draft.location}
            onChangeText={(v) => set('location', v)}
            mode="outlined"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="map-marker-outline" />}
            error={!!errors.location}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.location}>{errors.location}</HelperText>

          <TextInput
            label="Capacity (Optional)"
            value={draft.capacity}
            onChangeText={(v) => set('capacity', v)}
            mode="outlined"
            keyboardType="numeric"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="account-group-outline" />}
            error={!!errors.capacity}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.capacity}>{errors.capacity}</HelperText>

          <TextInput
            label="Entry Fee (Optional)"
            value={draft.entry_fee}
            onChangeText={(v) => set('entry_fee', v)}
            mode="outlined"
            placeholder="e.g. Free, ₹200"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Icon icon="currency-inr" />}
            style={styles.input}
          />

          <TextInput
            label="Additional Notes (Optional)"
            value={draft.notes}
            onChangeText={(v) => set('notes', v)}
            mode="outlined"
            multiline
            numberOfLines={3}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            style={styles.input}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={discardVisible} onDismiss={() => setDiscardVisible(false)} style={styles.dialog}>
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
          <Button mode="outlined" icon="image-edit-outline" onPress={onChange} textColor={PURPLE} style={styles.photoBtn}>
            Change Photo
          </Button>
          <Button mode="outlined" icon="delete-outline" onPress={onRemove} textColor={DANGER} style={styles.photoBtn}>
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
  scroll: { padding: 16, paddingBottom: 60 },
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
