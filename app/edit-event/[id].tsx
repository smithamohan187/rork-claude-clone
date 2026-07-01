// edit-event/[id].tsx — Edit event screen for the events module.
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
} from 'react-native-paper';
import { Image } from 'expo-image';
import { ArrowLeft, ImagePlus, Calendar, MapPin } from 'lucide-react-native';
import { DatePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { useEvent, useEvents } from '@/hooks/useEvents';
import { uploadEventImage, type Event, type UpdateEventPayload } from '@/api/services/eventsService';
import { useSnackbar } from '@/contexts/SnackbarContext';

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

interface DraftEvent {
  title: string;
  description: string;
  location: string;
  starts_at: string | null;
  ends_at: string | null;
  image_url: string | null;
}

function eventToDraft(e: Event): DraftEvent {
  return {
    title: e.title,
    description: e.description ?? '',
    location: e.location ?? '',
    starts_at: e.starts_at,
    ends_at: e.ends_at ?? null,
    image_url: e.image_url,
  };
}

type Errors = Partial<Record<keyof DraftEvent, string>>;

function validateDraft(d: DraftEvent): Errors {
  const e: Errors = {};
  if (!d.title.trim()) e.title = 'Title is required';
  if (!d.starts_at) e.starts_at = 'Event date is required';
  if (d.starts_at && d.ends_at && d.ends_at <= d.starts_at) {
    e.ends_at = 'End date must be after start date';
  }
  return e;
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { event: original, loading: eventLoading } = useEvent(id ?? '');
  const { editEvent } = useEvents();
  const scrollRef = useRef<ScrollView | null>(null);

  const [draft, setDraft]           = useState<DraftEvent | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [errors, setErrors]         = useState<Errors>({});
  const [discardVisible, setDiscardVisible] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'starts' | 'ends' | null>(null);

  useEffect(() => {
    if (original && !draft) setDraft(eventToDraft(original));
  }, [original, draft]);

  const hasChanges = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(eventToDraft(original)) !== JSON.stringify(draft);
  }, [original, draft]);

  const set = useCallback(<K extends keyof DraftEvent>(key: K, value: DraftEvent[K]) => {
    setDraft(d => d ? { ...d, [key]: value } : d);
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }, [errors]);

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

  const handleBack = useCallback(() => {
    if (hasChanges) setDiscardVisible(true);
    else router.back();
  }, [hasChanges, router]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    const errs = validateDraft(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    try {
      setSaving(true);
      const payload: UpdateEventPayload = {
        title:       draft.title.trim(),
        description: draft.description.trim() || null,
        location:    draft.location.trim() || null,
        starts_at:   draft.starts_at ?? undefined,
        ends_at:     draft.ends_at,
        ...(!localImageUri && { image_url: draft.image_url }),
      };
      await editEvent(id!, payload);
      if (localImageUri) await uploadEventImage(id!, localImageUri);
      showSnackbar('Event updated successfully');
      router.back();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setSaving(false);
    }
  }, [draft, id, localImageUri, editEvent, showSnackbar, router]);

  if (eventLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title="Edit Event" onBack={() => router.back()} onSave={undefined} saving={false} />
        <View style={styles.center}>
          <ActivityIndicator color={PURPLE} />
        </View>
      </SafeAreaView>
    );
  }

  if (!draft || !original) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header title="Edit Event" onBack={() => router.back()} onSave={undefined} saving={false} />
        <View style={styles.center}>
          <Text style={styles.missingText}>Event not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header title="Edit Event" onBack={handleBack} onSave={handleSave} saving={saving} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PhotoSection uri={draft.image_url} onChange={handleChangePhoto} onRemove={handleRemovePhoto} />

          <TextInput
            label="Title *"
            value={draft.title}
            onChangeText={(v) => set('title', v.slice(0, 200))}
            mode="outlined"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            right={<TextInput.Affix text={`${draft.title.length}/200`} />}
            error={!!errors.title}
            style={styles.input}
            testID="event-title-input"
          />
          <HelperText type="error" visible={!!errors.title}>{errors.title}</HelperText>

          <TextInput
            label="Description"
            value={draft.description}
            onChangeText={(v) => set('description', v.slice(0, 2000))}
            mode="outlined"
            multiline
            numberOfLines={4}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            style={styles.input}
            testID="event-description-input"
          />

          <TextInput
            label="Location"
            value={draft.location}
            onChangeText={(v) => set('location', v)}
            mode="outlined"
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            left={<TextInput.Icon icon={() => <MapPin size={18} color={TEXT_MUTED} />} />}
            style={styles.input}
            testID="event-location-input"
          />

          <TouchableOpacity
            style={[styles.dateBtn, !!errors.starts_at && styles.dateBtnError]}
            onPress={() => setPickerOpen('starts')}
            activeOpacity={0.7}
            testID="event-start-date-btn"
          >
            <Calendar size={16} color={TEXT_MUTED} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.dateBtnLabel}>Event Date & Time *</Text>
              <Text style={[styles.dateBtnValue, !draft.starts_at && styles.dateBtnPlaceholder]}>
                {draft.starts_at ? format(new Date(draft.starts_at), 'd MMM yyyy, HH:mm') : 'Select date & time'}
              </Text>
            </View>
          </TouchableOpacity>
          <HelperText type="error" visible={!!errors.starts_at}>{errors.starts_at}</HelperText>

          <TouchableOpacity
            style={[styles.dateBtn, !!errors.ends_at && styles.dateBtnError]}
            onPress={() => setPickerOpen('ends')}
            activeOpacity={0.7}
            testID="event-end-date-btn"
          >
            <Calendar size={16} color={TEXT_MUTED} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.dateBtnLabel}>End Date & Time (optional)</Text>
              <Text style={[styles.dateBtnValue, !draft.ends_at && styles.dateBtnPlaceholder]}>
                {draft.ends_at ? format(new Date(draft.ends_at), 'd MMM yyyy, HH:mm') : 'Select end date & time'}
              </Text>
            </View>
          </TouchableOpacity>
          {draft.ends_at && (
            <TouchableOpacity onPress={() => { set('ends_at', null); setErrors(e => ({ ...e, ends_at: undefined })); }} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear end date</Text>
            </TouchableOpacity>
          )}
          <HelperText type="error" visible={!!errors.ends_at}>{errors.ends_at}</HelperText>
        </ScrollView>

        <DatePickerModal
          locale="en"
          mode="single"
          visible={pickerOpen === 'starts'}
          onDismiss={() => setPickerOpen(null)}
          date={draft.starts_at ? new Date(draft.starts_at) : undefined}
          onConfirm={({ date }) => {
            if (date) set('starts_at', date.toISOString());
            setPickerOpen(null);
          }}
          saveLabel="Confirm"
        />

        <DatePickerModal
          locale="en"
          mode="single"
          visible={pickerOpen === 'ends'}
          onDismiss={() => setPickerOpen(null)}
          date={draft.ends_at ? new Date(draft.ends_at) : undefined}
          onConfirm={({ date }) => {
            if (date) set('ends_at', date.toISOString());
            setErrors(e => ({ ...e, ends_at: undefined }));
            setPickerOpen(null);
          }}
          validRange={draft.starts_at ? { startDate: new Date(draft.starts_at) } : undefined}
          saveLabel="Confirm"
        />
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
            <Button onPress={() => setDiscardVisible(false)} textColor={TEXT_MUTED}>Keep Editing</Button>
            <Button onPress={() => { setDiscardVisible(false); router.back(); }} textColor={DANGER} testID="discard-confirm">
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function Header({
  title,
  onBack,
  onSave,
  saving,
}: {
  title: string;
  onBack: () => void;
  onSave: (() => void) | undefined;
  saving: boolean;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} testID="edit-event-back">
        <ArrowLeft size={22} color={TEXT_DARK} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onSave} style={styles.saveBtn} disabled={!onSave || saving} testID="edit-event-save">
        {saving
          ? <ActivityIndicator color={PURPLE} size="small" />
          : <Text style={[styles.saveText, !onSave && { opacity: 0 }]}>Save</Text>
        }
      </TouchableOpacity>
    </View>
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
        <Image source={{ uri }} style={styles.photo} contentFit="cover" />
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
  input: { backgroundColor: '#fff', marginBottom: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { color: TEXT_MUTED, fontSize: 14 },
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  dateBtnError: { borderColor: DANGER },
  dateBtnLabel: { fontSize: 12, color: TEXT_MUTED, marginBottom: 2 },
  dateBtnValue: { fontSize: 15, color: TEXT_DARK },
  dateBtnPlaceholder: { color: '#C4C4CC' },
  clearBtn: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 4 },
  clearBtnText: { fontSize: 12, color: TEXT_MUTED },
});
