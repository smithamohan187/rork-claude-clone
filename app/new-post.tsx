import React, { useCallback, useState } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Camera, X } from 'lucide-react-native';
import { Snackbar } from 'react-native-paper';
import { usePosts } from '@/contexts/PostsContext';
import { formatRelativeTime } from '@/mocks/posts';

const PURPLE = '#1A5C35';
const CHAR_LIMIT = 500;

const DEFAULT_BUSINESS = {
  id: 'b1',
  name: 'The Brew House',
  logo: 'https://picsum.photos/seed/brew/100/100',
};

export default function NewPostScreen() {
  const router = useRouter();
  const { addPost } = usePosts();
  const [text, setText] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [snack, setSnack] = useState<string>('');

  const charCount = text.length;
  const overLimit = charCount > CHAR_LIMIT;
  const canPost = text.trim().length > 0 && !overLimit;

  const handleBack = useCallback(() => {
    if (text.trim().length === 0 && !image) {
      router.back();
      return;
    }
    Alert.alert('Discard post?', 'Your post will not be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router, text, image]);

  const handlePost = useCallback(() => {
    if (!canPost) return;
    addPost({
      text: text.trim(),
      image_url: image,
      business_id: DEFAULT_BUSINESS.id,
      business_name: DEFAULT_BUSINESS.name,
      business_logo: DEFAULT_BUSINESS.logo,
    });
    setSnack('Post published successfully');
    setTimeout(() => router.back(), 350);
  }, [addPost, canPost, image, router, text]);

  const handleAddPhoto = useCallback(() => {
    setImage(`https://picsum.photos/seed/post-${Date.now()}/600/400`);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} testID="new-post-back">
          <ArrowLeft size={22} color="#1A5C35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          disabled={!canPost}
          testID="new-post-submit"
        >
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.bizRow}>
            <Image source={{ uri: DEFAULT_BUSINESS.logo }} style={styles.bizLogo} contentFit="cover" />
            <Text style={styles.bizName}>{DEFAULT_BUSINESS.name}</Text>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Share an update, announcement, or moment…"
            placeholderTextColor="#9aa0a6"
            multiline
            style={styles.textInput}
            maxLength={CHAR_LIMIT + 60}
            testID="new-post-input"
          />

          <View style={styles.charCountRow}>
            <Text style={[styles.charCount, overLimit && { color: '#EF4444' }]}>
              {charCount} / {CHAR_LIMIT}
            </Text>
          </View>

          {image ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
              <TouchableOpacity style={styles.imageRemove} onPress={() => setImage(null)} hitSlop={8}>
                <X size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPhoto} onPress={handleAddPhoto} activeOpacity={0.7} testID="new-post-add-photo">
              <View style={styles.addPhotoIcon}>
                <Camera size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addPhotoTitle}>Add Photo</Text>
                <Text style={styles.addPhotoSub}>Make your post stand out</Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.previewLabel}>PREVIEW</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Image source={{ uri: DEFAULT_BUSINESS.logo }} style={styles.bizLogo} contentFit="cover" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bizName}>{DEFAULT_BUSINESS.name}</Text>
                <Text style={styles.previewTime}>{formatRelativeTime(new Date().toISOString())}</Text>
              </View>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>Post</Text>
              </View>
            </View>
            <Text style={styles.previewText}>{text || 'Your post text will appear here…'}</Text>
            {image ? <Image source={{ uri: image }} style={styles.previewImage} contentFit="cover" /> : null}
          </View>
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
  postBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '700' },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
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
  imageWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EDE9F6',
  },
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
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A5C35',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEE',
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center' },
  previewTime: { fontSize: 12, color: '#1A5C35', marginTop: 1 },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EDE9F6',
  },
  previewBadgeText: { color: PURPLE, fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },
  previewText: { marginTop: 12, fontSize: 15, lineHeight: 21, color: '#1A5C35' },
  previewImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#EDE9F6',
  },
});
