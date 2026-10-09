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
import { ArrowLeft, ImagePlus, Link2, Upload, Trash2, Video as VideoIcon } from 'lucide-react-native';
import { usePost } from '@/hooks/usePosts';
import { updatePost, uploadPostImage, uploadPostVideo } from '@/api/services/postsService';
import { PostMedia } from '@/components/feed/PostMedia';

// A single pending video selection — either a pasted external link or a device file picked
// but not yet uploaded. Only one may exist at a time, matching create-post.tsx's rule.
type PendingVideo =
  | { kind: 'link'; url: string }
  | { kind: 'upload'; uri: string; fileName: string };

// Mirrors the multer fileSize limit on the video upload route (backend/src/modules/posts/posts.routes.js).
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TOO_LARGE_TITLE = 'Video Too Large';
const VIDEO_TOO_LARGE_MESSAGE = 'This video is over 100MB. Please choose a shorter video or compress it before uploading.';

function isValidVideoUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch/i,
    /^https?:\/\/youtu\.be\//i,
    /^https?:\/\/(www\.)?vimeo\.com\//i,
    /^https?:\/\/(www\.)?tiktok\.com\//i,
    /^https?:\/\/(www\.)?dailymotion\.com\//i,
    /^https?:\/\/(www\.)?facebook\.com\/.*\/videos\//i,
    /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\//i,
    /^https?:\/\/.*\.(mp4|mov|webm|avi)(\?.*)?$/i,
  ];
  return patterns.some((p) => p.test(url));
}

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
  const [imageRemoved, setImageRemoved] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [discardVisible, setDiscardVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Media mode mirrors create-post.tsx's rule: a post has either a photo or a video, never both.
  const [mediaMode, setMediaMode] = useState<'photo' | 'video'>('photo');
  const [existingVideo, setExistingVideo] = useState<{ url: string; type: 'upload' | 'link' } | null>(null);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [videoLink, setVideoLink] = useState<string>('');
  const [videoLinkError, setVideoLinkError] = useState<string>('');

  useEffect(() => {
    if (original && !draft) {
      setDraft({ title: original.title, content: original.content });
      if (original.video_url && original.video_type) {
        setExistingVideo({ url: original.video_url, type: original.video_type });
        setMediaMode('video');
      } else {
        setMediaMode('photo');
      }
    }
  }, [original, draft]);

  const hasChanges = useMemo(() => {
    if (!original || !draft) return false;
    return (
      draft.title !== original.title ||
      draft.content !== original.content ||
      localImageUri !== null ||
      imageRemoved ||
      videoRemoved ||
      pendingVideo !== null
    );
  }, [draft, original, localImageUri, imageRemoved, videoRemoved, pendingVideo]);

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
      setImageRemoved(false);
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setLocalImageUri(null);
    setImageRemoved(true);
  }, []);

  const handleAddVideoLink = useCallback(() => {
    const trimmed = videoLink.trim();
    if (!trimmed) {
      setVideoLinkError('Please enter a video URL');
      return;
    }
    if (!isValidVideoUrl(trimmed)) {
      setVideoLinkError('Enter a valid video URL (YouTube, Vimeo, TikTok, etc.)');
      return;
    }
    setPendingVideo({ kind: 'link', url: trimmed });
    setExistingVideo(null);
    setVideoRemoved(true);
    setVideoLink('');
    setVideoLinkError('');
  }, [videoLink]);

  const handleUploadVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library access to upload videos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
          Alert.alert(VIDEO_TOO_LARGE_TITLE, VIDEO_TOO_LARGE_MESSAGE);
          return;
        }
        const fileName = asset.fileName || asset.uri.split('/').pop() || 'video';
        setPendingVideo({ kind: 'upload', uri: asset.uri, fileName });
        setExistingVideo(null);
        setVideoRemoved(true);
      }
    } catch (error) {
      if (__DEV__) console.log('[EditPost] Video upload error:', error);
      Alert.alert('Upload Failed', 'Something went wrong while selecting the video. Please try again.');
    }
  }, []);

  const handleRemoveVideo = useCallback(() => {
    setPendingVideo(null);
    setExistingVideo(null);
    setVideoRemoved(true);
  }, []);

  const handleSwitchToPhoto = useCallback(() => {
    setMediaMode('photo');
    setPendingVideo(null);
    setExistingVideo(null);
    setVideoRemoved(true);
  }, []);

  const handleSwitchToVideo = useCallback(() => {
    setMediaMode('video');
    setLocalImageUri(null);
    setImageRemoved(true);
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

  const currentImageUri = localImageUri ?? (imageRemoved ? null : original.image_url);

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
      const payload: {
        title: string;
        content: string;
        image_url?: null;
        video_url?: string | null;
        video_type?: 'upload' | 'link' | null;
      } = {
        title: draft.title.trim(),
        content: draft.content.trim(),
      };
      if (mediaMode === 'video') {
        if (imageRemoved || localImageUri) payload.image_url = null;
        if (pendingVideo?.kind === 'link') {
          payload.video_url = pendingVideo.url;
          payload.video_type = 'link';
        } else if (videoRemoved && !pendingVideo) {
          payload.video_url = null;
          payload.video_type = null;
        }
      } else {
        if (imageRemoved && !localImageUri) payload.image_url = null;
        if (videoRemoved) {
          payload.video_url = null;
          payload.video_type = null;
        }
      }
      await updatePost(id, payload);
      if (mediaMode === 'photo' && localImageUri) {
        await uploadPostImage(id, localImageUri);
      } else if (mediaMode === 'video' && pendingVideo?.kind === 'upload') {
        await uploadPostVideo(id, pendingVideo.uri);
      }
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (/file too large/i.test(message)) {
        Alert.alert(VIDEO_TOO_LARGE_TITLE, VIDEO_TOO_LARGE_MESSAGE);
      } else {
        Alert.alert('Error', message || 'Failed to save post');
      }
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
          <View style={styles.mediaModeRow}>
            <TouchableOpacity
              style={[styles.mediaModeBtn, mediaMode === 'photo' && styles.mediaModeBtnActive]}
              onPress={handleSwitchToPhoto}
              testID="edit-post-mode-photo"
            >
              <ImagePlus size={16} color={mediaMode === 'photo' ? '#fff' : TEXT_MUTED} />
              <Text style={[styles.mediaModeText, mediaMode === 'photo' && styles.mediaModeTextActive]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediaModeBtn, mediaMode === 'video' && styles.mediaModeBtnActive]}
              onPress={handleSwitchToVideo}
              testID="edit-post-mode-video"
            >
              <VideoIcon size={16} color={mediaMode === 'video' ? '#fff' : TEXT_MUTED} />
              <Text style={[styles.mediaModeText, mediaMode === 'video' && styles.mediaModeTextActive]}>Video</Text>
            </TouchableOpacity>
          </View>

          {mediaMode === 'photo' ? (
            <PhotoSection
              uri={currentImageUri}
              onChange={handleChangePhoto}
              onRemove={handleRemovePhoto}
            />
          ) : (
            <VideoSection
              existingVideo={!videoRemoved ? existingVideo : null}
              pendingVideo={pendingVideo}
              videoLink={videoLink}
              videoLinkError={videoLinkError}
              onVideoLinkChange={(v) => { setVideoLink(v); if (videoLinkError) setVideoLinkError(''); }}
              onAddVideoLink={handleAddVideoLink}
              onUploadVideo={handleUploadVideo}
              onRemoveVideo={handleRemoveVideo}
            />
          )}

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

function VideoSection({
  existingVideo,
  pendingVideo,
  videoLink,
  videoLinkError,
  onVideoLinkChange,
  onAddVideoLink,
  onUploadVideo,
  onRemoveVideo,
}: {
  existingVideo: { url: string; type: 'upload' | 'link' } | null;
  pendingVideo: PendingVideo | null;
  videoLink: string;
  videoLinkError: string;
  onVideoLinkChange: (v: string) => void;
  onAddVideoLink: () => void;
  onUploadVideo: () => void;
  onRemoveVideo: () => void;
}) {
  if (existingVideo || pendingVideo) {
    const previewUri = pendingVideo
      ? (pendingVideo.kind === 'upload' ? pendingVideo.uri : null)
      : existingVideo!.url;
    const label = pendingVideo
      ? (pendingVideo.kind === 'link' ? pendingVideo.url : pendingVideo.fileName)
      : existingVideo!.url;
    return (
      <View style={styles.photoWrap}>
        {previewUri ? (
          <PostMedia videoUrl={previewUri} videoType="upload" imageUrl={null} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.videoLinkPreview]}>
            <Link2 size={24} color={TEXT_MUTED} />
            <Text style={styles.videoLinkPreviewText} numberOfLines={2}>{label}</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Button mode="outlined" icon="delete-outline" onPress={onRemoveVideo} textColor={DANGER} style={styles.photoBtn}>
            Remove Video
          </Button>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.videoAddWrap}>
      <TouchableOpacity onPress={onUploadVideo} style={styles.photoPlaceholder} testID="add-video-upload">
        <Upload size={32} color={TEXT_MUTED} />
        <Text style={styles.photoPlaceholderText}>Upload a video</Text>
      </TouchableOpacity>
      <Text style={styles.videoLinkOrText}>— or paste a link —</Text>
      <View style={styles.videoLinkInputRow}>
        <TextInput
          value={videoLink}
          onChangeText={onVideoLinkChange}
          mode="outlined"
          placeholder="https://youtube.com/..."
          outlineColor={BORDER}
          activeOutlineColor={PURPLE}
          style={styles.videoLinkInput}
          testID="edit-post-video-link-input"
        />
        <TouchableOpacity onPress={onAddVideoLink} style={styles.videoLinkAddBtn} testID="edit-post-video-link-add">
          <Link2 size={18} color={PURPLE} />
        </TouchableOpacity>
      </View>
      <HelperText type="error" visible={!!videoLinkError}>{videoLinkError}</HelperText>
    </View>
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
  mediaModeRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 12 },
  mediaModeBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  mediaModeBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  mediaModeText: { fontSize: 13, fontWeight: '600' as const, color: TEXT_MUTED },
  mediaModeTextActive: { color: '#fff' },
  videoAddWrap: { marginBottom: 16 },
  videoLinkOrText: { textAlign: 'center' as const, color: TEXT_MUTED, fontSize: 12, marginVertical: 8 },
  videoLinkInputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  videoLinkInput: { flex: 1, backgroundColor: '#fff' },
  videoLinkAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  videoLinkPreview: { alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingHorizontal: 16 },
  videoLinkPreviewText: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center' as const },
});
