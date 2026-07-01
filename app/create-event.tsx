// create-event.tsx — Create event screen for the events module.
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
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { X, ImagePlus, Calendar, MapPin, Trash2, ChevronLeft } from 'lucide-react-native';
import { DatePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { useEvents } from '@/hooks/useEvents';
import { uploadEventImage } from '@/api/services/eventsService';

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
const BORDER = '#E8E4F0';
const TEXT_MUTED = '#6B7280';
const DANGER = '#ED4956';
const BG = '#F6F5FA';

interface FormErrors {
  title?: string;
  starts_at?: string;
  ends_at?: string;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const { addEvent } = useEvents();

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation]       = useState('');
  const [startsAt, setStartsAt]       = useState<Date | null>(null);
  const [endsAt, setEndsAt]           = useState<Date | null>(null);
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [errors, setErrors]           = useState<FormErrors>({});
  const [publishing, setPublishing]   = useState(false);
  const [pickerOpen, setPickerOpen]   = useState<'starts' | 'ends' | null>(null);

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!startsAt) errs.starts_at = 'Event date is required';
    if (startsAt && endsAt && endsAt <= startsAt) {
      errs.ends_at = 'End date must be after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, startsAt, endsAt]);

  const handlePickImage = useCallback(async () => {
    try {
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
        setImageUri(stable);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (!validate()) return;
    try {
      setPublishing(true);
      const event = await addEvent({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        starts_at: startsAt!.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
      });
      if (imageUri) await uploadEventImage(event.id, imageUri);
      router.back();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setPublishing(false);
    }
  }, [validate, addEvent, title, description, location, startsAt, endsAt, imageUri, router]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft size={22} color={PURPLE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Cover Image */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cover Image</Text>
            {imageUri ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setImageUri(null)} activeOpacity={0.7}>
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imageUploadArea} onPress={handlePickImage} activeOpacity={0.7} testID="image-upload-area">
                <ImagePlus size={26} color={PURPLE} />
                <Text style={styles.imageUploadTitle}>Tap to upload image</Text>
                <Text style={styles.imageUploadSub}>JPG, PNG up to 10MB</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <View style={styles.section}>
            <TextInput
              label="Title *"
              value={title}
              onChangeText={(t) => { setTitle(t); if (errors.title) setErrors(p => ({ ...p, title: undefined })); }}
              mode="outlined"
              style={styles.input}
              outlineColor={errors.title ? DANGER : BORDER}
              activeOutlineColor={PURPLE}
              error={!!errors.title}
              testID="event-title-input"
              placeholder="e.g. Summer Open Day"
              theme={{ colors: { background: '#fff' } }}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={[styles.input, styles.multilineInput]}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              multiline
              numberOfLines={4}
              testID="event-description-input"
              placeholder="Tell attendees what to expect..."
              theme={{ colors: { background: '#fff' } }}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <TextInput
              label="Location"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              left={<TextInput.Icon icon={() => <MapPin size={18} color={TEXT_MUTED} />} />}
              testID="event-location-input"
              placeholder="Address or venue name"
              theme={{ colors: { background: '#fff' } }}
            />
          </View>

          {/* Event Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Event Date & Time *</Text>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.starts_at && styles.dateBtnError]}
              onPress={() => setPickerOpen('starts')}
              testID="event-start-date-btn"
              activeOpacity={0.7}
            >
              <Calendar size={16} color={TEXT_MUTED} />
              <Text style={[styles.dateBtnText, !startsAt && styles.dateBtnPlaceholder]}>
                {startsAt ? format(startsAt, 'd MMM yyyy, HH:mm') : 'Select event date & time'}
              </Text>
            </TouchableOpacity>
            {errors.starts_at && <Text style={styles.errorText}>{errors.starts_at}</Text>}
          </View>

          {/* End Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>End Date & Time (optional)</Text>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.ends_at && styles.dateBtnError]}
              onPress={() => setPickerOpen('ends')}
              testID="event-end-date-btn"
              activeOpacity={0.7}
            >
              <Calendar size={16} color={TEXT_MUTED} />
              <Text style={[styles.dateBtnText, !endsAt && styles.dateBtnPlaceholder]}>
                {endsAt ? format(endsAt, 'd MMM yyyy, HH:mm') : 'Select end date & time'}
              </Text>
            </TouchableOpacity>
            {endsAt && (
              <TouchableOpacity onPress={() => setEndsAt(null)} style={styles.clearDateBtn}>
                <X size={14} color={TEXT_MUTED} />
                <Text style={styles.clearDateText}>Clear end date</Text>
              </TouchableOpacity>
            )}
            {errors.ends_at && <Text style={styles.errorText}>{errors.ends_at}</Text>}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={publishing}
            activeOpacity={0.85}
            testID="publish-btn"
          >
            <Text style={styles.publishBtnText}>{publishing ? 'Creating…' : 'Create Event'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={pickerOpen === 'starts'}
        onDismiss={() => setPickerOpen(null)}
        date={startsAt ?? undefined}
        onConfirm={({ date }) => {
          if (date) setStartsAt(date);
          if (errors.starts_at) setErrors(p => ({ ...p, starts_at: undefined }));
          setPickerOpen(null);
        }}
        saveLabel="Confirm"
      />

      <DatePickerModal
        locale="en"
        mode="single"
        visible={pickerOpen === 'ends'}
        onDismiss={() => setPickerOpen(null)}
        date={endsAt ?? undefined}
        onConfirm={({ date }) => {
          if (date) setEndsAt(date);
          setErrors(p => ({ ...p, ends_at: undefined }));
          setPickerOpen(null);
        }}
        saveLabel="Confirm"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECF1',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0F1115',
  },
  headerSpacer: {
    width: 30,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0F1115',
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: DANGER,
    marginTop: 2,
  },
  imageUploadArea: {
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageUploadTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: PURPLE,
  },
  imageUploadSub: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  imagePreviewWrap: {
    position: 'relative',
  },
  imagePreview: {
    height: 180,
    borderRadius: 12,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateBtnError: {
    borderColor: DANGER,
  },
  dateBtnText: {
    fontSize: 14,
    color: '#0F1115',
  },
  dateBtnPlaceholder: {
    color: TEXT_MUTED,
  },
  clearDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  clearDateText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  publishBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
