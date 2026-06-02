import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, X } from 'lucide-react-native';
import { Snackbar } from 'react-native-paper';
import { usePosts } from '@/contexts/PostsContext';

const PURPLE = '#1A5C35';
const CHAR_LIMIT = 500;

export default function EditPostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPost, updatePost } = usePosts();
  const post = id ? getPost(id) : undefined;

  const [text, setText] = useState<string>(post?.text ?? '');
  const [image, setImage] = useState<string | null>(post?.image_url ?? null);
  const [snack, setSnack] = useState<string>('');
  const [dirty, setDirty] = useState<boolean>(false);

  useEffect(() => {
    if (!post && id) {
      router.back();
    }
  }, [id, post, router]);

  const charCount = text.length;
  const overLimit = charCount > CHAR_LIMIT;
  const canSave = text.trim().length > 0 && !overLimit;

  const onChangeText = useCallback((t: string) => {
    setText(t);
    setDirty(true);
  }, []);

  const handleAddPhoto = useCallback(() => {
    setImage(`https://picsum.photos/seed/post-${Date.now()}/600/400`);
    setDirty(true);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImage(null);
    setDirty(true);
  }, []);

  const handleBack = useCallback(() => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits will not be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [dirty, router]);

  const handleSave = useCallback(() => {
    if (!canSave || !id) return;
    updatePost(id, { text: text.trim(), image_url: image });
    setSnack('Post updated');
    setTimeout(() => router.back(), 350);
  }, [canSave, id, image, router, text, updatePost]);

  if (!post) {
    return <SafeAreaView style={styles.safe} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} testID="edit-post-back">
          <ArrowLeft size={22} color="#1A5C35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          disabled={!canSave}
          testID="edit-post-save"
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.bizRow}>
            <Image source={{ uri: post.business_logo }} style={styles.bizLogo} contentFit="cover" />
            <Text style={styles.bizName}>{post.business_name}</Text>
          </View>

          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder="Share an update, announcement, or moment…"
            placeholderTextColor="#9aa0a6"
            multiline
            style={styles.textInput}
            maxLength={CHAR_LIMIT + 60}
            testID="edit-post-input"
          />

          <View style={styles.charCountRow}>
            <Text style={[styles.charCount, overLimit && { color: '#EF4444' }]}>
              {charCount} / {CHAR_LIMIT}
            </Text>
          </View>

          {image ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
              <TouchableOpacity style={styles.imageRemove} onPress={handleRemoveImage} hitSlop={8} testID="edit-post-remove-image">
                <X size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPhoto} onPress={handleAddPhoto} activeOpacity={0.7} testID="edit-post-add-photo">
              <View style={styles.addPhotoIcon}>
                <Camera size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addPhotoTitle}>Add Photo</Text>
                <Text style={styles.addPhotoSub}>Make your post stand out</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={1800}>
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F7FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A5C35' },
  saveBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  bizRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  bizLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9F6' },
  bizName: { marginLeft: 10, fontSize: 15, fontWeight: '700', color: '#1A5C35' },
  textInput: {
    minHeight: 140,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 16,
    color: '#1A5C35',
    textAlignVertical: 'top',
  },
  charCountRow: { paddingHorizontal: 16, alignItems: 'flex-end' },
  charCount: { fontSize: 12, color: '#1A5C35' },
  imageWrap: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: '#EDE9F6' },
  image: { width: '100%', aspectRatio: 16 / 10 },
  imageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  addPhotoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addPhotoTitle: { fontSize: 15, fontWeight: '700', color: '#1A5C35' },
  addPhotoSub: { fontSize: 12, color: '#1A5C35', marginTop: 2 },
});
