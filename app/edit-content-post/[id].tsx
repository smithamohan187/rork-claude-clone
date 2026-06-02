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
import { useManageContent, type PostItem } from '@/contexts/ManageContentContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

const PURPLE = '#1A5C35';
const PURPLE_SURFACE = '#F3F0FF';
const BG = '#F6F5FA';
const TEXT_DARK = '#0F1115';
const TEXT_MUTED = '#6B7280';
const BORDER = '#ECECF1';
const DANGER = '#ED4956';

type Errors = Partial<Record<'text', string>>;

const validate = (d: PostItem): Errors => {
  const e: Errors = {};
  if (!d.text.trim()) e.text = 'Post content cannot be empty';
  else if (d.text.trim().length < 10) e.text = 'Post must be at least 10 characters';
  return e;
};

const BUSINESS_NAME = 'The Brew House';
const BUSINESS_LOGO = 'https://picsum.photos/seed/brew/100/100';

export default function EditContentPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPost, updatePost } = useManageContent();
  const { showSnackbar } = useSnackbar();
  const original = id ? getPost(id) : undefined;

  const [draft, setDraft] = useState<PostItem | null>(original ?? null);
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
          <Text style={styles.headerTitle}>Edit Post</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Post not found.</Text>
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
    updatePost(draft.id, draft);
    showSnackbar('Post updated successfully');
    router.back();
  };

  const handleChangeText = (v: string) => {
    if (v.length <= 500) {
      setDraft((d) => (d ? { ...d, text: v } : d));
      if (errors.text) setErrors({});
    }
  };

  const handleChangePhoto = () =>
    setDraft((d) =>
      d ? { ...d, image_url: `https://picsum.photos/seed/${d.id}_edit_${Date.now()}/600/400` } : d,
    );
  const handleRemovePhoto = () => setDraft((d) => (d ? { ...d, image_url: null } : d));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="edit-post-back">
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} testID="edit-post-save">
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
          <PhotoSection
            uri={draft.image_url}
            onChange={handleChangePhoto}
            onRemove={handleRemovePhoto}
          />

          <TextInput
            label="Post *"
            value={draft.text}
            onChangeText={handleChangeText}
            mode="outlined"
            multiline
            numberOfLines={5}
            placeholder="Share an update, announcement, or moment..."
            outlineColor={BORDER}
            activeOutlineColor={PURPLE}
            error={!!errors.text}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.text}>{errors.text}</HelperText>
          <HelperText type="info">{draft.text.length} / 500</HelperText>

          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Image source={{ uri: BUSINESS_LOGO }} style={styles.previewLogo} />
              <View style={styles.flex}>
                <Text style={styles.previewBusiness}>{BUSINESS_NAME}</Text>
                <Text style={styles.previewTime}>Just now</Text>
              </View>
            </View>
            <Text style={styles.previewText}>
              {draft.text.trim() || 'Post text appears here live...'}
            </Text>
            {draft.image_url ? (
              <Image source={{ uri: draft.image_url }} style={styles.previewImage} />
            ) : null}
          </View>
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
  previewLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: TEXT_MUTED,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  previewLogo: { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE_SURFACE },
  previewBusiness: { fontSize: 14, fontWeight: '700' as const, color: TEXT_DARK },
  previewTime: { fontSize: 12, color: TEXT_MUTED },
  previewText: { fontSize: 14, color: TEXT_DARK, lineHeight: 20, marginBottom: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 10, backgroundColor: BORDER },
});
