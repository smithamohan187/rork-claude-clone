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
} from 'react-native-paper';
import { ArrowLeft, ImagePlus } from 'lucide-react-native';
import { usePost } from '@/hooks/usePosts';
import { updatePost, uploadPostImage } from '@/api/services/postsService';

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

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';
const TEXT_DARK = '#0F1115';
const TEXT_MUTED = '#6B7280';
const BORDER = '#ECECF1';
const DANGER = '#ED4956';

type Draft = { title: string; content: string };
type Errors = { title?: string; content?: string };

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { post: original, loading } = usePost(id ?? '');

  const [draft, setDraft] = useState<Draft | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [discardVisible, setDiscardVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (original && !draft) {
      setDraft({ title: original.title, content: original.content });
    }
  }, [original, draft]);

  const hasChanges = useMemo(() => {
    if (!original || !draft) return false;
    return (
      draft.title !== original.title ||
      draft.content !== original.content ||
      localImageUri !== null
    );
  }, [draft, original, localImageUri]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!draft?.title.trim()) e.title = 'Title is required';
    if (!draft?.content.trim()) e.content = 'Content is required';
    setErrors(e);
    return Object.keys(e).length === 0;
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
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setLocalImageUri(null);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Post</Text>
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
          <Text style={styles.headerTitle}>Edit Post</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Post not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentImageUri = localImageUri ?? original.image_url;

  const handleBack = () => {
    if (hasChanges) setDiscardVisible(true);
    else router.back();
  };

  const handleSave = async () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    try {
      setSaving(true);
      await updatePost(id, { title: draft.title.trim(), content: draft.content.trim() });
      if (localImageUri) await uploadPostImage(id, localImageUri);
      router.back();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="edit-post-back">
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving} testID="edit-post-save">
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
            uri={currentImageUri}
            onChange={handleChangePhoto}
            onRemove={handleRemovePhoto}
          />

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
            testID="edit-post-title"
          />
          <HelperText type="error" visible={!!errors.title}>{errors.title}</HelperText>

          <TextInput
            label="Content *"
            value={draft.content}
            onChangeText={(v) => set('content', v)}
            mode="outlined"
            multiline
            numberOfLines={6}
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            error={!!errors.content}
            style={styles.input}
            testID="edit-post-content"
          />
          <HelperText type="error" visible={!!errors.content}>{errors.content}</HelperText>
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
