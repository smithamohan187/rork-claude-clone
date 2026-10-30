import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TextInput as PaperInput, Switch } from 'react-native-paper';
import {
  X,
  Check,
  ImagePlus,
  Megaphone,
  Bell,
  FileText,
  AlignLeft,
  ChevronDown,
  Video,
  Globe,
  Upload,
  Play,
  Film,
  Link,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  Percent,
  Zap,
  Sparkles,
} from 'lucide-react-native';
import { DatePickerModal, TimePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { createPost, updatePost, uploadPostVideo } from '@/api/services/postsService';
import { fetchMyUploads, uploadMedia, deleteMedia, type MediaItem } from '@/api/services/businessMediaService';
import { createOffer, updateOffer, type CreateOfferPayload, type OfferType } from '@/api/services/offersService';
import { useEvents } from '@/hooks/useEvents';
import { type EventCategory, type EventType } from '@/api/services/eventsService';
import { useSnackbar } from '@/contexts/SnackbarContext';

registerTranslation('en', en);

// Converts a local image URI to a stable display URI immediately after picking.
// On Expo web, ImagePicker returns a blob: URL that gets revoked between renders,
// causing the preview image to disappear. We convert to base64 right away so the
// URI remains valid for both display and upload. Native file:// URIs are stable.
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

type PostType = 'promotion' | 'announcement' | 'general';
type TabMode = 'post' | 'event' | 'offer';

// A single pending video selection for the Post tab — either a pasted external
// link or a device file picked but not yet uploaded. Only one may exist at a time.
type PendingVideo =
  | { kind: 'link'; url: string }
  | { kind: 'upload'; uri: string; fileName: string; duration: number | null };

// Mirrors the multer fileSize limit on the video upload route (backend/src/modules/posts/posts.routes.js).
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TOO_LARGE_TITLE = 'Video Too Large';
const VIDEO_TOO_LARGE_MESSAGE = 'This video is over 100MB. Please choose a shorter video or compress it before uploading.';

const POST_TYPE_OPTIONS: { value: PostType; label: string; icon: 'megaphone' | 'bell' | 'file' }[] = [
  { value: 'promotion', label: 'Promotion', icon: 'megaphone' },
  { value: 'announcement', label: 'Announcement', icon: 'bell' },
  { value: 'general', label: 'General', icon: 'file' },
];

const OFFER_TYPES: { value: OfferType; label: string; icon: typeof Megaphone }[] = [
  { value: 'promotion', label: 'Promotion', icon: Megaphone },
  { value: 'discount', label: 'Discount', icon: Percent },
  { value: 'flash_sale', label: 'Flash Sale', icon: Zap },
];

const EVENT_CATEGORIES: { value: EventCategory; label: string; emoji: string }[] = [
  { value: 'food', label: 'Food & Drink', emoji: '🍽️' },
  { value: 'fitness', label: 'Fitness', emoji: '💪' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'art', label: 'Art & Culture', emoji: '🎨' },
  { value: 'community', label: 'Community', emoji: '🤝' },
  { value: 'wellness', label: 'Wellness', emoji: '🧘' },
  { value: 'market', label: 'Market', emoji: '🛍️' },
  { value: 'nightlife', label: 'Nightlife', emoji: '🌙' },
];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'In Person', label: 'In Person' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' },
];

type MediaSource = 'stock' | 'uploads';

const MEDIA_SOURCES: { key: MediaSource; label: string; icon: 'globe' | 'upload' }[] = [
  { key: 'uploads', label: 'Upload Photo', icon: 'upload' },
  { key: 'stock', label: 'Stock Photos', icon: 'globe' },
];

const IMAGE_LIBRARY: Record<MediaSource, string[]> = {
  stock: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
  ],
  uploads: [],
};

interface FormErrors {
  title?: string;
  description?: string;
  discount?: string;
  startDate?: string;
  endDate?: string;
  eventTitle?: string;
  eventDate?: string;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const { authUser, accountType } = useAuth();
  const { showSnackbar } = useSnackbar();

  // ---- Tab mode (Post / Event / Offer) ----
  // Defaults to 'post' — this screen is also reached from the dashboard checklist's
  // "Add a post" step and must open straight into the Post tab with no params — but
  // Manage Content's Create Offer/Event buttons pass ?tab= to land on the right tab.
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabMode>(
    (tab === 'event' ? 'event' : tab === 'offer' ? 'offer' : 'post') as TabMode,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const tabIndicatorAnim = useRef(
    new Animated.Value(activeTab === 'post' ? 0 : activeTab === 'event' ? 1 : 2),
  ).current;

  // ---- Post tab state ----
  const [content, setContent] = useState<string>('');
  const [selectedType, setSelectedType] = useState<PostType>('general');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
  const [activeMediaSource, setActiveMediaSource] = useState<MediaSource>('stock');
  const [mediaTab, setMediaTab] = useState<'images' | 'videos'>('images');
  const [videoLink, setVideoLink] = useState<string>('');
  const [videoLinkError, setVideoLinkError] = useState<string>('');
  // At most one pending video can be attached to a post, mirroring the single
  // image rule and the DB's single `video_url` column.
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  const isBusiness = accountType === 'business';

  // "My Uploads" — a private, paginated photo library per business, populated by the
  // "Upload from device" button below and reusable across future posts too.
  const [myUploads, setMyUploads] = useState<MediaItem[]>([]);
  const [myUploadsLoading, setMyUploadsLoading] = useState<boolean>(false);
  const [myUploadsHasMore, setMyUploadsHasMore] = useState<boolean>(false);
  const [pickingPhoto, setPickingPhoto] = useState<boolean>(false);
  const [brokenImageUrls, setBrokenImageUrls] = useState<Set<string>>(new Set());
  // Declared early (ahead of the rest of the Offer tab state block below) because
  // handleDeleteUpload, defined just after this, references it.
  const [offerImage, setOfferImage] = useState<string>('');

  const loadMyUploads = useCallback(async (offset: number, replace: boolean) => {
    setMyUploadsLoading(true);
    try {
      const { items, hasMore } = await fetchMyUploads(20, offset);
      setMyUploads(prev => (replace ? items : [...prev, ...items]));
      setMyUploadsHasMore(hasMore);
    } catch (err) {
      if (__DEV__) console.log('[CreatePost] Failed to load my uploads:', err);
    } finally {
      setMyUploadsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isBusiness) loadMyUploads(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusiness]);

  const handleLoadMoreUploads = useCallback(() => {
    if (myUploadsLoading || !myUploadsHasMore) return;
    loadMyUploads(myUploads.length, false);
  }, [myUploadsLoading, myUploadsHasMore, myUploads.length, loadMyUploads]);

  const handlePickFromDevice = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [600, 400],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const stable = await toDisplayUri(result.assets[0].uri);
      setPickingPhoto(true);
      const media = await uploadMedia(stable);
      setMyUploads(prev => [media, ...prev]);
      setSelectedImage(media.image_url);
      setPendingVideo(null);
    } catch (err) {
      if (__DEV__) console.log('[CreatePost] Upload error:', err);
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload your photo. Please try again.');
    } finally {
      setPickingPhoto(false);
    }
  }, []);

  const handleDeleteUpload = useCallback((id: string, imageUrl: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setMyUploads(prev => prev.filter(m => m.id !== id));
          if (selectedImage === imageUrl) setSelectedImage('');
          if (offerImage === imageUrl) setOfferImage('');
          try {
            await deleteMedia(id);
          } catch (err) {
            if (__DEV__) console.log('[CreatePost] Delete failed, reloading list:', err);
            loadMyUploads(0, true);
          }
        },
      },
    ]);
  }, [selectedImage, offerImage, loadMyUploads]);

  // Offer cover image reuses the same business-scoped "My Uploads" library as the
  // Post tab's image picker — offers don't need generic stock photography, so this
  // is upload-from-device + reuse-previous-photo only (no stock tab).
  const handleOfferPickFromDevice = useCallback(async () => {
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
      if (result.canceled || !result.assets?.[0]) return;
      const stable = await toDisplayUri(result.assets[0].uri);
      setPickingOfferPhoto(true);
      const media = await uploadMedia(stable);
      setMyUploads(prev => [media, ...prev]);
      setOfferImage(media.image_url);
    } catch (err) {
      if (__DEV__) console.log('[CreatePost] Offer upload error:', err);
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload your photo. Please try again.');
    } finally {
      setPickingOfferPhoto(false);
    }
  }, []);

  const handleEventPickFromDevice = useCallback(async () => {
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
      if (result.canceled || !result.assets?.[0]) return;
      const stable = await toDisplayUri(result.assets[0].uri);
      setPickingEventPhoto(true);
      const media = await uploadMedia(stable);
      setMyUploads(prev => [media, ...prev]);
      setEventImage(media.image_url);
    } catch (err) {
      if (__DEV__) console.log('[CreatePost] Event upload error:', err);
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload your photo. Please try again.');
    } finally {
      setPickingEventPhoto(false);
    }
  }, []);

  const isFormValid = content.trim().length > 0;

  const charCount = content.length;
  const MAX_CHARS = 500;

  // ---- Offer tab state ----
  const [offerTitle, setOfferTitle] = useState<string>('');
  const [offerDescription, setOfferDescription] = useState<string>('');
  const [offerType, setOfferType] = useState<OfferType>('promotion');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [offerStartDate, setOfferStartDate] = useState<string>('');
  const [offerEndDate, setOfferEndDate] = useState<string>('');
  const [offerPickerField, setOfferPickerField] = useState<'start' | 'end' | null>(null);
  const [offerIsActive, setOfferIsActive] = useState<boolean>(true);
  const [offerOriginalPrice, setOfferOriginalPrice] = useState<string>('');
  const [offerTerms, setOfferTerms] = useState<string>('');
  const [offerTags, setOfferTags] = useState<string>('');
  const [offerIsHot, setOfferIsHot] = useState<boolean>(false);
  const [offerPromoCode, setOfferPromoCode] = useState<string>('');
  const [pickingOfferPhoto, setPickingOfferPhoto] = useState<boolean>(false);
  const [pickingEventPhoto, setPickingEventPhoto] = useState<boolean>(false);

  // ---- Event tab state ----
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventDateOpen, setEventDateOpen] = useState<boolean>(false);
  const [eventTimeOpen, setEventTimeOpen] = useState<boolean>(false);
  const [eventImage, setEventImage] = useState<string>('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('community');
  const [eventType, setEventType] = useState<EventType>('In Person');
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [eventIsFree, setEventIsFree] = useState<boolean>(true);
  const [eventIsHot, setEventIsHot] = useState<boolean>(false);
  const [eventPrice, setEventPrice] = useState<string>('');
  const [eventTags, setEventTags] = useState<string>('');

  const { addEvent, editEvent } = useEvents();

  const clearErrors = useCallback(() => setErrors({}), []);

  const handleTabChange = useCallback((value: TabMode) => {
    setActiveTab(value);
    clearErrors();
    if (value === 'post') {
      setOfferTitle(''); setOfferDescription(''); setOfferType('promotion');
      setDiscountPercent(''); setOfferImage(''); setOfferStartDate(''); setOfferEndDate('');
      setOfferIsActive(true);
      setOfferOriginalPrice(''); setOfferTerms(''); setOfferTags('');
      setOfferIsHot(false); setOfferPromoCode('');
      setEventTitle(''); setEventDescription(''); setEventLocation('');
      setEventDate(null); setEventImage('');
      setEventCategory('community'); setEventType('In Person'); setEventIsFree(true); setEventIsHot(false);
      setEventPrice(''); setEventTags(''); setShowCategoryPicker(false);
    } else if (value === 'event') {
      setOfferTitle(''); setOfferDescription(''); setOfferType('promotion');
      setDiscountPercent(''); setOfferImage(''); setOfferStartDate(''); setOfferEndDate('');
      setOfferIsActive(true);
      setOfferOriginalPrice(''); setOfferTerms(''); setOfferTags('');
      setOfferIsHot(false); setOfferPromoCode('');
    } else {
      setEventTitle(''); setEventDescription(''); setEventLocation('');
      setEventDate(null); setEventImage('');
      setEventCategory('community'); setEventType('In Person'); setEventIsFree(true); setEventIsHot(false);
      setEventPrice(''); setEventTags(''); setShowCategoryPicker(false);
    }
    Animated.spring(tabIndicatorAnim, {
      toValue: value === 'post' ? 0 : value === 'event' ? 1 : 2,
      useNativeDriver: false,
      speed: 20,
      bounciness: 2,
    }).start();
  }, [clearErrors, tabIndicatorAnim]);

  const validateOfferForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!offerTitle.trim()) newErrors.title = 'Title is required';
    if (!offerDescription.trim()) newErrors.description = 'Description is required';
    if (offerType === 'discount') {
      const num = parseInt(discountPercent, 10);
      if (!discountPercent.trim()) {
        newErrors.discount = 'Discount percentage is required';
      } else if (isNaN(num) || num < 1 || num > 100) {
        newErrors.discount = 'Enter a value between 1 and 100';
      }
    }
    if (!offerStartDate.trim()) newErrors.startDate = 'Start date is required';
    if (!offerEndDate.trim()) newErrors.endDate = 'End date is required';
    if (offerStartDate && offerEndDate && new Date(offerEndDate) < new Date(offerStartDate))
      newErrors.endDate = 'End date must be after start date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [offerTitle, offerDescription, offerType, discountPercent, offerStartDate, offerEndDate]);

  const validateEventForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!eventTitle.trim()) newErrors.eventTitle = 'Event title is required';
    if (!eventDate) newErrors.eventDate = 'Event date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [eventTitle, eventDate]);

  const handleSubmit = useCallback(async () => {
    if (activeTab === 'post') {
      if (!isFormValid) {
        Alert.alert('Missing Content', 'Please write something for your post.');
        return;
      }
      if (charCount > MAX_CHARS) {
        Alert.alert('Too Long', `Please keep your post under ${MAX_CHARS} characters.`);
        return;
      }

      setIsSubmitting(true);
      try {
        const trimmed = content.trim();
        const title = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
        const post = await createPost({ title, content: trimmed, post_type: selectedType });
        if (selectedImage) {
          await updatePost(post.id, { image_url: selectedImage });
        } else if (pendingVideo) {
          if (pendingVideo.kind === 'link') {
            await updatePost(post.id, { video_url: pendingVideo.url, video_type: 'link' });
          } else {
            await uploadPostVideo(post.id, pendingVideo.uri);
          }
        }

        Animated.sequence([
          Animated.timing(successAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.delay(800),
        ]).start(() => {
          showSnackbar('Post published!');
          router.dismissTo('/content?tab=posts' as any);
        });
      } catch (err) {
        setIsSubmitting(false);
        const message = err instanceof Error ? err.message : '';
        if (/file too large/i.test(message)) {
          Alert.alert(VIDEO_TOO_LARGE_TITLE, VIDEO_TOO_LARGE_MESSAGE);
        } else {
          Alert.alert('Error', message || 'Failed to publish your post. Please try again.');
        }
      }
      return;
    }

    if (activeTab === 'offer') {
      if (!validateOfferForm()) return;

      const payload: CreateOfferPayload = {
        title: offerTitle.trim(),
        description: offerDescription.trim() || null,
        offer_type: offerType,
        discount_type: offerType === 'discount' ? 'percent' : null,
        discount_value: offerType === 'discount' && discountPercent ? parseInt(discountPercent, 10) : null,
        original_price: parseFloat(offerOriginalPrice) || null,
        terms: offerTerms.trim() || null,
        starts_at: offerStartDate ? new Date(offerStartDate).toISOString() : null,
        expires_at: offerEndDate ? new Date(offerEndDate).toISOString() : null,
        status: offerIsActive ? 'active' : 'disabled',
        tags: offerTags.split(',').map(t => t.trim()).filter(Boolean),
        is_hot: offerIsHot,
        promo_code: offerPromoCode.trim() || null,
      };

      setIsSubmitting(true);
      try {
        const offer = await createOffer(payload);
        // offerImage is already a hosted URL by this point (uploaded via uploadMedia when
        // picked, or a stock/my-uploads URL) — set it with a plain JSON update rather than
        // uploadOfferImage's multipart re-fetch, which CORS-fails on web for cross-origin URLs.
        if (offerImage) await updateOffer(offer.id, { image_url: offerImage });

        Animated.sequence([
          Animated.timing(successAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.delay(800),
        ]).start(() => {
          showSnackbar(`"${offer.title}" is now live for your subscribers.`);
          router.dismissTo('/content?tab=offers' as any);
        });
      } catch (err) {
        setIsSubmitting(false);
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create your offer. Please try again.');
      }
      return;
    }

    // activeTab === 'event'
    if (!validateEventForm()) return;
    setIsSubmitting(true);
    try {
      const event = await addEvent({
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        location: eventLocation.trim() || null,
        starts_at: eventDate!.toISOString(),
        ends_at: null,
        event_type: eventType,
        category: eventCategory,
        is_free: eventIsFree,
        price: eventIsFree ? null : (eventPrice.trim() || null),
        tags: eventTags.split(',').map(t => t.trim()).filter(Boolean),
        is_hot: eventIsHot,
      });
      // Same as the offer path above: eventImage is already a hosted URL, so set it via a
      // plain JSON update instead of the multipart upload endpoint.
      if (eventImage) await editEvent(event.id, { image_url: eventImage });

      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(800),
      ]).start(() => {
        showSnackbar(`"${event.title}" will now appear on the community newsfeed.`);
        router.dismissTo('/content?tab=events' as any);
      });
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create your event. Please try again.');
    }
  }, [
    activeTab, isFormValid, charCount, content, selectedType, selectedImage, pendingVideo, successAnim, router,
    showSnackbar,
    validateOfferForm, offerTitle, offerDescription, offerType, discountPercent,
    offerStartDate, offerEndDate, offerIsActive, offerImage,
    offerOriginalPrice, offerTerms, offerTags, offerIsHot, offerPromoCode,
    validateEventForm, eventTitle, eventDescription, eventLocation, eventDate, eventImage, addEvent, editEvent,
    eventCategory, eventType, eventIsFree, eventPrice, eventTags, eventIsHot,
  ]);

  const isSubmitDisabled = activeTab === 'post' ? !isFormValid : isSubmitting;
  const submitLabel = activeTab === 'post' ? 'Post' : activeTab === 'event' ? 'Create Event' : 'Create Offer';

  const isValidVideoUrl = useCallback((url: string): boolean => {
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
    return patterns.some((p) => p.test(url.trim()));
  }, []);

  const getVideoPlatform = useCallback((url: string): string => {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
    if (/vimeo\.com/i.test(url)) return 'Vimeo';
    if (/tiktok\.com/i.test(url)) return 'TikTok';
    if (/dailymotion\.com/i.test(url)) return 'Dailymotion';
    if (/facebook\.com/i.test(url)) return 'Facebook';
    if (/instagram\.com/i.test(url)) return 'Instagram';
    return 'Video';
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
    // Replaces any existing pending video (link or upload) — only one video
    // may be attached to a post at a time, matching the DB's single video_url column.
    setPendingVideo({ kind: 'link', url: trimmed });
    setVideoLink('');
    setVideoLinkError('');
    setSelectedImage('');
  }, [videoLink, isValidVideoUrl]);

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
        const duration = asset.duration ? Math.round(asset.duration / 1000) : null;
        // Replaces any existing pending video (link or upload) — only one video
        // may be attached to a post at a time.
        setPendingVideo({ kind: 'upload', uri: asset.uri, fileName, duration });
        setSelectedImage('');
      }
    } catch (error) {
      if (__DEV__) console.log('Video upload error:', error);
      Alert.alert('Upload Failed', 'Something went wrong while selecting the video. Please try again.');
    }
  }, []);

  const handleRemovePendingVideo = useCallback(() => {
    setPendingVideo(null);
  }, []);

  const formatDuration = useCallback((seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const successScale = successAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  const getTypeIcon = (type: PostType) => {
    switch (type) {
      case 'promotion':
        return <Megaphone size={18} color={Colors.accent} />;
      case 'announcement':
        return <Bell size={18} color={Colors.teal} />;
      default:
        return <FileText size={18} color={Colors.lavender} />;
    }
  };

  const getTypeBadgeStyle = (type: PostType) => {
    switch (type) {
      case 'promotion':
        return { backgroundColor: Colors.accentLight, borderColor: Colors.accent };
      case 'announcement':
        return { backgroundColor: '#E0FBF5', borderColor: Colors.teal };
      default:
        return { backgroundColor: '#E8F5EE', borderColor: Colors.lavender };
    }
  };

  const getTypeLabelColor = (type: PostType) => {
    switch (type) {
      case 'promotion':
        return Colors.navyDark;
      case 'announcement':
        return '#0D6B58';
      default:
        return '#1A5C35';
    }
  };

  const selectedTypeOption = POST_TYPE_OPTIONS.find((o) => o.value === selectedType);
  const selectedEventCategory = EVENT_CATEGORIES.find((o) => o.value === eventCategory);

  const renderSectionHeader = (icon: React.ReactNode, title: string) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconBadge}>{icon}</View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderPostForm = () => (
    <>
      <View style={styles.authorRow}>
        <Image source={{ uri: authUser?.avatar }} style={styles.authorAvatar} />
        <View style={styles.authorMeta}>
          <Text style={styles.authorName}>{authUser?.name}</Text>
          <TouchableOpacity
            style={[styles.typeBadge, getTypeBadgeStyle(selectedType)]}
            onPress={() => setShowTypePicker(!showTypePicker)}
            activeOpacity={0.7}
          >
            {getTypeIcon(selectedType)}
            <Text style={[styles.typeBadgeText, { color: getTypeLabelColor(selectedType) }]}>
              {selectedTypeOption?.label}
            </Text>
            <ChevronDown size={14} color={getTypeLabelColor(selectedType)} />
          </TouchableOpacity>
        </View>
      </View>

      {showTypePicker && (
        <View style={styles.typePickerCard}>
          {POST_TYPE_OPTIONS.map((option) => {
            const isActive = selectedType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.typeOption, isActive && styles.typeOptionActive]}
                onPress={() => {
                  setSelectedType(option.value);
                  setShowTypePicker(false);
                }}
                activeOpacity={0.7}
              >
                {getTypeIcon(option.value)}
                <Text style={[styles.typeOptionText, isActive && styles.typeOptionTextActive]}>
                  {option.label}
                </Text>
                {isActive && <Check size={16} color={Colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.contentBox}>
        <TextInput
          style={styles.contentInput}
          placeholder="What's happening with your business?"
          placeholderTextColor={Colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          testID="post-content-input"
          maxLength={MAX_CHARS + 50}
        />
        <View style={styles.charCountRow}>
          <AlignLeft size={14} color={Colors.textTertiary} />
          <Text style={[styles.charCount, charCount > MAX_CHARS && styles.charCountOver]}>
            {charCount}/{MAX_CHARS}
          </Text>
        </View>
      </View>

      <View style={styles.mediaTabRow}>
        <TouchableOpacity
          style={[styles.mediaTabBtn, mediaTab === 'images' && styles.mediaTabBtnActive]}
          onPress={() => setMediaTab('images')}
          activeOpacity={0.7}
        >
          <ImagePlus size={16} color={mediaTab === 'images' ? '#fff' : Colors.textTertiary} />
          <Text style={[styles.mediaTabText, mediaTab === 'images' && styles.mediaTabTextActive]}>Images</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mediaTabBtn, mediaTab === 'videos' && styles.mediaTabBtnActive]}
          onPress={() => setMediaTab('videos')}
          activeOpacity={0.7}
        >
          <Film size={16} color={mediaTab === 'videos' ? '#fff' : Colors.textTertiary} />
          <Text style={[styles.mediaTabText, mediaTab === 'videos' && styles.mediaTabTextActive]}>Videos</Text>
        </TouchableOpacity>
      </View>

      {mediaTab === 'images' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceRow}>
            {MEDIA_SOURCES.map((source) => {
              const isActive = activeMediaSource === source.key;
              const SourceIcon = source.icon === 'globe' ? Globe : Upload;
              return (
                <TouchableOpacity
                  key={source.key}
                  style={[styles.sourceChip, isActive && styles.sourceChipActive]}
                  onPress={() => setActiveMediaSource(source.key)}
                  activeOpacity={0.7}
                >
                  <SourceIcon size={14} color={isActive ? Colors.navyDark : Colors.textSecondary} />
                  <Text style={[styles.sourceChipText, isActive && styles.sourceChipTextActive]}>{source.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {activeMediaSource === 'stock' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
              <TouchableOpacity
                style={styles.inlineUploadTile}
                activeOpacity={0.7}
                onPress={handlePickFromDevice}
                disabled={pickingPhoto}
              >
                {pickingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.textTertiary} />
                ) : (
                  <Upload size={20} color={Colors.textTertiary} />
                )}
                <Text style={styles.inlineUploadTileText}>Upload</Text>
              </TouchableOpacity>
              {IMAGE_LIBRARY.stock.map((img) => (
                <TouchableOpacity
                  key={img}
                  style={[styles.imageThumbnail, selectedImage === img && styles.imageThumbnailSelected]}
                  onPress={() => {
                    setSelectedImage(selectedImage === img ? '' : img);
                    setPendingVideo(null);
                  }}
                  activeOpacity={0.8}
                >
                  {brokenImageUrls.has(img) ? (
                    <View style={[styles.thumbImage, styles.thumbFallback]}>
                      <ImagePlus size={18} color={Colors.textTertiary} />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: img }}
                      style={styles.thumbImage}
                      contentFit="cover"
                      onError={() => setBrokenImageUrls(prev => new Set(prev).add(img))}
                    />
                  )}
                  {selectedImage === img && (
                    <View style={styles.imageCheck}>
                      <Check size={14} color={Colors.navyDark} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {activeMediaSource === 'uploads' && isBusiness && (
            <>
              <TouchableOpacity
                style={styles.addImagePlaceholder}
                activeOpacity={0.7}
                onPress={handlePickFromDevice}
                disabled={pickingPhoto}
              >
                {pickingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.textTertiary} />
                ) : (
                  <Upload size={28} color={Colors.textTertiary} />
                )}
                <Text style={styles.addImageText}>{pickingPhoto ? 'Uploading…' : 'Upload from device'}</Text>
                <Text style={styles.addImageSubtext}>Add a new photo to your library</Text>
              </TouchableOpacity>

              {(myUploads.length > 0 || myUploadsLoading) && (
                <>
                  {myUploads.length > 0 && <Text style={styles.myUploadsLabel}>My Uploads</Text>}
                  <FlatList
                    horizontal
                    data={myUploads}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imageRow}
                    onEndReached={handleLoadMoreUploads}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={myUploadsLoading ? (
                      <View style={styles.myUploadsLoadingWrap}>
                        <ActivityIndicator size="small" color={Colors.textTertiary} />
                      </View>
                    ) : null}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.imageThumbnail, selectedImage === item.image_url && styles.imageThumbnailSelected]}
                        onPress={() => {
                          setSelectedImage(selectedImage === item.image_url ? '' : item.image_url);
                          setPendingVideo(null);
                        }}
                        activeOpacity={0.8}
                      >
                        {brokenImageUrls.has(item.image_url) ? (
                          <View style={[styles.thumbImage, styles.thumbFallback]}>
                            <ImagePlus size={18} color={Colors.textTertiary} />
                          </View>
                        ) : (
                          <Image
                            source={{ uri: item.image_url }}
                            style={styles.thumbImage}
                            contentFit="cover"
                            onError={() => setBrokenImageUrls(prev => new Set(prev).add(item.image_url))}
                          />
                        )}
                        {selectedImage === item.image_url && (
                          <View style={styles.imageCheck}>
                            <Check size={14} color={Colors.navyDark} />
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.uploadDeleteBtn}
                          onPress={() => handleDeleteUpload(item.id, item.image_url)}
                          hitSlop={8}
                        >
                          <X size={12} color="#fff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
            </>
          )}

          {selectedImage ? (
            <View style={styles.previewContainer}>
              {brokenImageUrls.has(selectedImage) ? (
                <View style={[styles.previewImage, styles.thumbFallback]}>
                  <ImagePlus size={28} color={Colors.textTertiary} />
                </View>
              ) : (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  contentFit="cover"
                  onError={() => setBrokenImageUrls(prev => new Set(prev).add(selectedImage))}
                />
              )}
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage('')}>
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}

      {mediaTab === 'videos' && (
        <>
          <View style={styles.videoLinkSection}>
            <View style={styles.videoLinkHeader}>
              <Link size={18} color={Colors.accent} />
              <Text style={styles.videoLinkTitle}>Add Video Link</Text>
            </View>
            <Text style={styles.videoLinkDesc}>Paste a link from YouTube, Vimeo, TikTok, Instagram, or any direct video URL</Text>
            <View style={styles.videoLinkInputRow}>
              <TextInput
                style={styles.videoLinkInput}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={Colors.textTertiary}
                value={videoLink}
                onChangeText={(t) => {
                  setVideoLink(t);
                  if (videoLinkError) setVideoLinkError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                testID="video-link-input"
              />
              <TouchableOpacity
                style={[styles.videoLinkAddBtn, !videoLink.trim() && styles.videoLinkAddBtnDisabled]}
                onPress={handleAddVideoLink}
                activeOpacity={0.7}
                testID="add-video-link-btn"
              >
                <Check size={18} color={videoLink.trim() ? Colors.navyDark : Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {videoLinkError ? <Text style={styles.videoLinkError}>{videoLinkError}</Text> : null}
            <View style={styles.supportedPlatforms}>
              <Text style={styles.supportedLabel}>Supported:</Text>
              {['YouTube', 'Vimeo', 'TikTok', 'Instagram', 'Facebook', 'MP4/MOV'].map((p) => (
                <View key={p} style={styles.platformBadge}>
                  <Text style={styles.platformBadgeText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>

          {pendingVideo?.kind === 'link' && (
            <View style={styles.addedLinksSection}>
              <Text style={styles.addedLinksTitle}>Added Video</Text>
              <View style={styles.addedLinkCard}>
                <View style={styles.addedLinkIconWrap}>
                  <Play size={16} color="#fff" fill="#fff" />
                </View>
                <View style={styles.addedLinkMeta}>
                  <Text style={styles.addedLinkPlatform}>{getVideoPlatform(pendingVideo.url)}</Text>
                  <Text style={styles.addedLinkUrl} numberOfLines={1}>{pendingVideo.url}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addedLinkRemoveBtn}
                  onPress={handleRemovePendingVideo}
                  activeOpacity={0.7}
                >
                  <Trash2 size={15} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {pendingVideo?.kind === 'upload' && (
            <View style={styles.uploadedVideosSection}>
              <Text style={styles.addedLinksTitle}>Uploaded from Device</Text>
              <View style={styles.uploadedVideoCard}>
                <View style={styles.uploadedVideoIconWrap}>
                  <Film size={16} color="#fff" />
                </View>
                <View style={styles.addedLinkMeta}>
                  <Text style={styles.addedLinkPlatform} numberOfLines={1}>{pendingVideo.fileName}</Text>
                  <Text style={styles.addedLinkUrl}>Duration: {formatDuration(pendingVideo.duration)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addedLinkRemoveBtn}
                  onPress={handleRemovePendingVideo}
                  activeOpacity={0.7}
                >
                  <Trash2 size={15} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.uploadVideoBtn} activeOpacity={0.7} onPress={handleUploadVideo} testID="upload-video-btn">
            <Video size={22} color={Colors.accent} />
            <View style={styles.uploadVideoTextWrap}>
              <Text style={styles.uploadVideoTitle}>Upload from Device</Text>
              <Text style={styles.uploadVideoSubtext}>Select MP4, MOV from your laptop, iPad, phone, or PC</Text>
            </View>
            <Upload size={18} color={Colors.accent} />
          </TouchableOpacity>
        </>
      )}

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Posting Tips</Text>
        <View style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>Promotions reach more users with eye-catching images</Text>
        </View>
        <View style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>Announcements are great for events and updates</Text>
        </View>
        <View style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>Use emojis and hashtags to boost engagement</Text>
        </View>
      </View>
    </>
  );

  const renderOfferTypePills = () => (
    <View style={styles.pillRow}>
      {OFFER_TYPES.map((item) => {
        const isSelected = offerType === item.value;
        const IconComp = item.icon;
        return (
          <Pressable
            key={item.value}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => {
              setOfferType(item.value);
              if (item.value !== 'discount') setErrors(prev => ({ ...prev, discount: undefined }));
            }}
            testID={`offer-type-${item.value}`}
          >
            <IconComp size={14} color={isSelected ? '#fff' : Colors.navyDark} />
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderOfferForm = () => (
    <>
      <View style={styles.formSection}>
        {renderSectionHeader(<Tag size={14} color="#fff" />, 'Offer Details')}

        <PaperInput
          label="Title"
          value={offerTitle}
          onChangeText={(t) => { setOfferTitle(t); if (errors.title) setErrors(prev => ({ ...prev, title: undefined })); }}
          mode="outlined"
          style={styles.paperInput}
          outlineColor={errors.title ? Colors.error : Colors.borderLight}
          activeOutlineColor={Colors.accent}
          error={!!errors.title}
          testID="offer-title-input"
          placeholder="e.g. Summer Special 20% Off"
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <PaperInput
          label="Description"
          value={offerDescription}
          onChangeText={(t) => { setOfferDescription(t); if (errors.description) setErrors(prev => ({ ...prev, description: undefined })); }}
          mode="outlined"
          style={[styles.paperInput, styles.paperMultiline]}
          outlineColor={errors.description ? Colors.error : Colors.borderLight}
          activeOutlineColor={Colors.accent}
          error={!!errors.description}
          multiline
          numberOfLines={4}
          testID="offer-description-input"
          placeholder="Describe your offer..."
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

        <PaperInput
          label="Terms & Conditions"
          value={offerTerms}
          onChangeText={setOfferTerms}
          mode="outlined"
          style={[styles.paperInput, styles.paperMultiline]}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          multiline
          numberOfLines={3}
          testID="offer-terms-input"
          placeholder="Any restrictions or fine print for this offer..."
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Sparkles size={14} color="#fff" />, 'Offer Type')}
        {renderOfferTypePills()}

        {offerType === 'discount' && (
          <View style={styles.discountRow}>
            <View style={styles.discountIconWrap}>
              <Percent size={18} color="#fff" />
            </View>
            <View style={styles.discountInputWrap}>
              <PaperInput
                label="Discount %"
                value={discountPercent}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '');
                  setDiscountPercent(cleaned);
                  if (errors.discount) setErrors(prev => ({ ...prev, discount: undefined }));
                }}
                mode="outlined"
                style={styles.paperInput}
                outlineColor={errors.discount ? Colors.error : Colors.borderLight}
                activeOutlineColor={Colors.accent}
                error={!!errors.discount}
                keyboardType="numeric"
                maxLength={3}
                testID="discount-percent-input"
                placeholder="e.g. 25"
                right={<PaperInput.Affix text="%" />}
                theme={{ colors: { background: '#fff' } }}
              />
            </View>
          </View>
        )}
        {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}

        <PaperInput
          label="Original Price"
          value={offerOriginalPrice}
          onChangeText={(t) => setOfferOriginalPrice(t.replace(/[^0-9.]/g, ''))}
          mode="outlined"
          style={[styles.paperInput, { marginTop: 14 }]}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          keyboardType="decimal-pad"
          testID="offer-original-price-input"
          placeholder="e.g. 49.99"
          left={<PaperInput.Affix text="$" />}
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Zap size={14} color="#fff" />, 'Boost & Tags')}

        <PaperInput
          label="Tags"
          value={offerTags}
          onChangeText={setOfferTags}
          mode="outlined"
          style={styles.paperInput}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          testID="offer-tags-input"
          placeholder="Weekend, Members Only, Limited Time"
          theme={{ colors: { background: '#fff' } }}
        />

        <PaperInput
          label="Promo Code"
          value={offerPromoCode}
          onChangeText={setOfferPromoCode}
          mode="outlined"
          style={[styles.paperInput, { marginTop: 14 }]}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          autoCapitalize="characters"
          testID="offer-promo-code-input"
          placeholder="e.g. SAVE20"
          theme={{ colors: { background: '#fff' } }}
        />

        <View style={[styles.eventToggleRow, { marginTop: 14 }]}>
          <View style={styles.eventToggleCol}>
            <Text style={styles.eventToggleLabel}>Mark as Hot</Text>
            <TouchableOpacity
              style={[styles.eventToggleTrack, offerIsHot && styles.eventToggleTrackOn]}
              onPress={() => setOfferIsHot(!offerIsHot)}
              activeOpacity={0.8}
              testID="offer-hot-toggle"
            >
              <View style={[styles.eventToggleThumb, offerIsHot && styles.eventToggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<ImagePlus size={14} color="#fff" />, 'Cover Image')}

        {offerImage ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: offerImage }} style={styles.imagePreview} contentFit="cover" />
            <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setOfferImage('')} activeOpacity={0.7}>
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.addImagePlaceholder}
              activeOpacity={0.7}
              onPress={handleOfferPickFromDevice}
              disabled={pickingOfferPhoto}
              testID="offer-image-upload-area"
            >
              {pickingOfferPhoto ? (
                <ActivityIndicator size="small" color={Colors.textTertiary} />
              ) : (
                <Upload size={28} color={Colors.textTertiary} />
              )}
              <Text style={styles.addImageText}>{pickingOfferPhoto ? 'Uploading…' : 'Upload from device'}</Text>
              <Text style={styles.addImageSubtext}>Add a new photo to your library</Text>
            </TouchableOpacity>

            {(myUploads.length > 0 || myUploadsLoading) && (
              <FlatList
                horizontal
                data={myUploads}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageRow}
                onEndReached={handleLoadMoreUploads}
                onEndReachedThreshold={0.5}
                ListFooterComponent={myUploadsLoading ? (
                  <View style={styles.myUploadsLoadingWrap}>
                    <ActivityIndicator size="small" color={Colors.textTertiary} />
                  </View>
                ) : null}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.imageThumbnail, offerImage === item.image_url && styles.imageThumbnailSelected]}
                    onPress={() => setOfferImage(offerImage === item.image_url ? '' : item.image_url)}
                    activeOpacity={0.8}
                  >
                    {brokenImageUrls.has(item.image_url) ? (
                      <View style={[styles.thumbImage, styles.thumbFallback]}>
                        <ImagePlus size={18} color={Colors.textTertiary} />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.thumbImage}
                        contentFit="cover"
                        onError={() => setBrokenImageUrls(prev => new Set(prev).add(item.image_url))}
                      />
                    )}
                    {offerImage === item.image_url && (
                      <View style={styles.imageCheck}>
                        <Check size={14} color={Colors.navyDark} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.uploadDeleteBtn}
                      onPress={() => handleDeleteUpload(item.id, item.image_url)}
                      hitSlop={8}
                    >
                      <X size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Calendar size={14} color="#fff" />, 'Schedule')}

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.startDate && styles.dateBtnError]}
              onPress={() => setOfferPickerField('start')}
              testID="offer-start-date"
              activeOpacity={0.7}
            >
              <Calendar size={15} color={Colors.textSecondary} />
              <Text style={[styles.dateBtnText, !offerStartDate && styles.dateBtnPlaceholder]}>
                {offerStartDate ? format(new Date(offerStartDate), 'd MMM yyyy') : 'Start Date'}
              </Text>
            </TouchableOpacity>
            {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
          </View>
          <View style={styles.dateField}>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.endDate && styles.dateBtnError]}
              onPress={() => setOfferPickerField('end')}
              testID="offer-end-date"
              activeOpacity={0.7}
            >
              <Calendar size={15} color={Colors.textSecondary} />
              <Text style={[styles.dateBtnText, !offerEndDate && styles.dateBtnPlaceholder]}>
                {offerEndDate ? format(new Date(offerEndDate), 'd MMM yyyy') : 'End Date'}
              </Text>
            </TouchableOpacity>
            {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
          </View>
        </View>

        <DatePickerModal
          locale="en"
          mode="single"
          visible={offerPickerField !== null}
          onDismiss={() => setOfferPickerField(null)}
          date={
            offerPickerField === 'start'
              ? (offerStartDate ? new Date(offerStartDate) : undefined)
              : (offerEndDate ? new Date(offerEndDate) : undefined)
          }
          onChange={({ date }) => {
            if (!date) { setOfferPickerField(null); return; }
            const iso = date.toISOString();
            if (offerPickerField === 'start') {
              setOfferStartDate(iso);
              setErrors(prev => ({ ...prev, startDate: undefined }));
            } else {
              setOfferEndDate(iso);
              setErrors(prev => ({ ...prev, endDate: undefined }));
            }
            setOfferPickerField(null);
          }}
          onConfirm={() => setOfferPickerField(null)}
          validRange={offerPickerField === 'end' && offerStartDate ? { startDate: new Date(offerStartDate) } : undefined}
        />
      </View>

      <View style={styles.formSection}>
        <View style={styles.activeToggleRow}>
          <View style={styles.activeToggleLeft}>
            <View style={[styles.activeToggleDot, offerIsActive && styles.activeToggleDotOn]} />
            <View>
              <Text style={styles.activeToggleLabel}>Active</Text>
              <Text style={styles.activeToggleSub}>
                {offerIsActive ? 'Offer is visible to subscribers' : 'Offer is saved as draft'}
              </Text>
            </View>
          </View>
          <Switch value={offerIsActive} onValueChange={setOfferIsActive} color={Colors.accent} testID="offer-active-toggle" />
        </View>
      </View>
    </>
  );

  const renderEventForm = () => (
    <>
      <View style={styles.formSection}>
        {renderSectionHeader(<Tag size={14} color="#fff" />, 'Event Details')}

        <PaperInput
          label="Title *"
          value={eventTitle}
          onChangeText={(t) => { setEventTitle(t); if (errors.eventTitle) setErrors(prev => ({ ...prev, eventTitle: undefined })); }}
          mode="outlined"
          style={styles.paperInput}
          outlineColor={errors.eventTitle ? Colors.error : Colors.borderLight}
          activeOutlineColor={Colors.accent}
          error={!!errors.eventTitle}
          testID="event-title-input"
          placeholder="e.g. Grand Opening Celebration"
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.eventTitle && <Text style={styles.errorText}>{errors.eventTitle}</Text>}

        <PaperInput
          label="Description"
          value={eventDescription}
          onChangeText={setEventDescription}
          mode="outlined"
          style={[styles.paperInput, styles.paperMultiline]}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          multiline
          numberOfLines={4}
          testID="event-description-input"
          placeholder="Tell attendees what to expect..."
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<ImagePlus size={14} color="#fff" />, 'Cover Image')}

        {eventImage ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: eventImage }} style={styles.imagePreview} contentFit="cover" />
            <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setEventImage('')} activeOpacity={0.7}>
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.addImagePlaceholder}
              activeOpacity={0.7}
              onPress={handleEventPickFromDevice}
              disabled={pickingEventPhoto}
              testID="event-image-upload-area"
            >
              {pickingEventPhoto ? (
                <ActivityIndicator size="small" color={Colors.textTertiary} />
              ) : (
                <Upload size={28} color={Colors.textTertiary} />
              )}
              <Text style={styles.addImageText}>{pickingEventPhoto ? 'Uploading…' : 'Upload from device'}</Text>
              <Text style={styles.addImageSubtext}>Add a new photo to your library</Text>
            </TouchableOpacity>

            {(myUploads.length > 0 || myUploadsLoading) && (
              <FlatList
                horizontal
                data={myUploads}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageRow}
                onEndReached={handleLoadMoreUploads}
                onEndReachedThreshold={0.5}
                ListFooterComponent={myUploadsLoading ? (
                  <View style={styles.myUploadsLoadingWrap}>
                    <ActivityIndicator size="small" color={Colors.textTertiary} />
                  </View>
                ) : null}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.imageThumbnail, eventImage === item.image_url && styles.imageThumbnailSelected]}
                    onPress={() => setEventImage(eventImage === item.image_url ? '' : item.image_url)}
                    activeOpacity={0.8}
                  >
                    {brokenImageUrls.has(item.image_url) ? (
                      <View style={[styles.thumbImage, styles.thumbFallback]}>
                        <ImagePlus size={18} color={Colors.textTertiary} />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.thumbImage}
                        contentFit="cover"
                        onError={() => setBrokenImageUrls(prev => new Set(prev).add(item.image_url))}
                      />
                    )}
                    {eventImage === item.image_url && (
                      <View style={styles.imageCheck}>
                        <Check size={14} color={Colors.navyDark} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.uploadDeleteBtn}
                      onPress={() => handleDeleteUpload(item.id, item.image_url)}
                      hitSlop={8}
                    >
                      <X size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<MapPin size={14} color="#fff" />, 'Location')}

        <PaperInput
          label="Location"
          value={eventLocation}
          onChangeText={setEventLocation}
          mode="outlined"
          style={styles.paperInput}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          testID="event-location-input"
          placeholder="Venue name or address"
          left={<PaperInput.Icon icon={() => <MapPin size={15} color={Colors.textSecondary} />} />}
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Calendar size={14} color="#fff" />, 'Date & Time')}

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.eventDate && styles.dateBtnError]}
              onPress={() => setEventDateOpen(true)}
              testID="event-start-date-btn"
              activeOpacity={0.7}
            >
              <Calendar size={15} color={Colors.textSecondary} />
              <Text style={[styles.dateBtnText, !eventDate && styles.dateBtnPlaceholder]}>
                {eventDate ? format(eventDate, 'EEE, MMM d') : 'Date *'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateField}>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.eventDate && styles.dateBtnError]}
              onPress={() => setEventTimeOpen(true)}
              testID="event-start-time-btn"
              activeOpacity={0.7}
            >
              <Calendar size={15} color={Colors.textSecondary} />
              <Text style={[styles.dateBtnText, !eventDate && styles.dateBtnPlaceholder]}>
                {eventDate ? format(eventDate, 'h:mm a') : 'Time *'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {errors.eventDate && <Text style={styles.errorText}>{errors.eventDate}</Text>}
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Sparkles size={14} color="#fff" />, 'Category')}

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          activeOpacity={0.7}
          testID="event-category-trigger"
        >
          <Text style={styles.categoryEmoji}>{selectedEventCategory?.emoji}</Text>
          <Text style={styles.dateBtnText}>{selectedEventCategory?.label}</Text>
          <ChevronDown size={16} color={Colors.textSecondary} />
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={[styles.typePickerCard, { marginTop: 10, marginBottom: 0 }]}>
            {EVENT_CATEGORIES.map((option) => {
              const isActive = eventCategory === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.typeOption, isActive && styles.typeOptionActive]}
                  onPress={() => {
                    setEventCategory(option.value);
                    setShowCategoryPicker(false);
                  }}
                  activeOpacity={0.7}
                  testID={`event-category-${option.value}`}
                >
                  <Text style={styles.categoryEmoji}>{option.emoji}</Text>
                  <Text style={[styles.typeOptionText, isActive && styles.typeOptionTextActive]}>
                    {option.label}
                  </Text>
                  {isActive && <Check size={16} color={Colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Globe size={14} color="#fff" />, 'Event Type')}
        <View style={styles.pillRow}>
          {EVENT_TYPES.map((item) => {
            const isSelected = eventType === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setEventType(item.value)}
                testID={`event-type-${item.value}`}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.eventToggleRow}>
          <View style={styles.eventToggleCol}>
            <Text style={styles.eventToggleLabel}>Free Event</Text>
            <TouchableOpacity
              style={[styles.eventToggleTrack, eventIsFree && styles.eventToggleTrackOn]}
              onPress={() => setEventIsFree(!eventIsFree)}
              activeOpacity={0.8}
              testID="event-free-toggle"
            >
              <View style={[styles.eventToggleThumb, eventIsFree && styles.eventToggleThumbOn]} />
            </TouchableOpacity>
          </View>
          <View style={styles.eventToggleCol}>
            <Text style={styles.eventToggleLabel}>Mark as Hot</Text>
            <TouchableOpacity
              style={[styles.eventToggleTrack, eventIsHot && styles.eventToggleTrackOn]}
              onPress={() => setEventIsHot(!eventIsHot)}
              activeOpacity={0.8}
              testID="event-hot-toggle"
            >
              <View style={[styles.eventToggleThumb, eventIsHot && styles.eventToggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {!eventIsFree && (
          <PaperInput
            label="Ticket Price"
            value={eventPrice}
            onChangeText={setEventPrice}
            mode="outlined"
            style={[styles.paperInput, { marginTop: 14 }]}
            outlineColor={Colors.borderLight}
            activeOutlineColor={Colors.accent}
            testID="event-price-input"
            placeholder="e.g. $15"
            theme={{ colors: { background: '#fff' } }}
          />
        )}
      </View>

      <View style={styles.formSection}>
        {renderSectionHeader(<Tag size={14} color="#fff" />, 'Tags')}

        <PaperInput
          label="Tags"
          value={eventTags}
          onChangeText={setEventTags}
          mode="outlined"
          style={styles.paperInput}
          outlineColor={Colors.borderLight}
          activeOutlineColor={Colors.accent}
          testID="event-tags-input"
          placeholder="Food, Live Music, Outdoor"
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={eventDateOpen}
        onDismiss={() => setEventDateOpen(false)}
        date={eventDate ?? undefined}
        onChange={({ date }) => {
          if (date) {
            const merged = eventDate
              ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), eventDate.getHours(), eventDate.getMinutes())
              : date;
            setEventDate(merged);
            setErrors(p => ({ ...p, eventDate: undefined }));
          }
          setEventDateOpen(false);
        }}
        onConfirm={() => setEventDateOpen(false)}
      />

      <TimePickerModal
        locale="en"
        visible={eventTimeOpen}
        onDismiss={() => setEventTimeOpen(false)}
        hours={eventDate ? eventDate.getHours() : new Date().getHours()}
        minutes={eventDate ? eventDate.getMinutes() : new Date().getMinutes()}
        onConfirm={({ hours, minutes }) => {
          const base = eventDate ?? new Date();
          const merged = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes);
          setEventDate(merged);
          setErrors(p => ({ ...p, eventDate: undefined }));
          setEventTimeOpen(false);
        }}
      />

    </>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="close-create-post">
            <X size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Content</Text>
          <View style={styles.headerRightSpacer} />
        </View>
      </SafeAreaView>

      {isSubmitting ? (
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={48} color={Colors.navyDark} />
          </Animated.View>
          <Text style={styles.successText}>
            {activeTab === 'post' ? 'Publishing your post…' : activeTab === 'event' ? 'Creating your event…' : 'Creating your offer…'}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tabToggleContainer}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    left: tabIndicatorAnim.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: ['1%', '34%', '67%'],
                    }),
                  },
                ]}
              />
              <Pressable style={styles.tabBtn} onPress={() => handleTabChange('post')} testID="tab-post">
                <FileText size={14} color={activeTab === 'post' ? '#fff' : Colors.navyDark} />
                <Text style={[styles.tabBtnText, activeTab === 'post' && styles.tabBtnTextActive]}>Post</Text>
              </Pressable>
              <Pressable style={styles.tabBtn} onPress={() => handleTabChange('event')} testID="tab-event">
                <Calendar size={14} color={activeTab === 'event' ? '#fff' : Colors.navyDark} />
                <Text style={[styles.tabBtnText, activeTab === 'event' && styles.tabBtnTextActive]}>Event</Text>
              </Pressable>
              <Pressable style={styles.tabBtn} onPress={() => handleTabChange('offer')} testID="tab-offer">
                <Tag size={14} color={activeTab === 'offer' ? '#fff' : Colors.navyDark} />
                <Text style={[styles.tabBtnText, activeTab === 'offer' && styles.tabBtnTextActive]}>Offer</Text>
              </Pressable>
            </View>

            {activeTab === 'post' ? renderPostForm() : activeTab === 'event' ? renderEventForm() : renderOfferForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {!isSubmitting && (
        <SafeAreaView edges={['bottom']} style={styles.bottomBarSafe}>
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.publishBtnFull, isSubmitDisabled && styles.publishBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              testID="publish-post"
            >
              <Text style={[styles.publishTextFull, isSubmitDisabled && styles.publishTextDisabled]}>{submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafe: {
    backgroundColor: Colors.banner,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  headerRightSpacer: {
    width: 36,
  },
  bottomBarSafe: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  publishBtnFull: {
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  publishTextFull: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.1,
  },
  publishTextDisabled: {
    color: Colors.textTertiary,
  },
  form: {
    padding: 20,
    paddingBottom: 110,
  },
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 3,
    position: 'relative',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '32%',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    zIndex: 0,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    zIndex: 1,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.navyDark,
    letterSpacing: -0.2,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
    marginTop: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  typePickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  typeOptionActive: {
    backgroundColor: Colors.accentLight,
  },
  typeOptionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '400' as const,
  },
  typeOptionTextActive: {
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  contentBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
    overflow: 'hidden',
  },
  contentInput: {
    fontSize: 16,
    color: Colors.text,
    padding: 16,
    minHeight: 140,
    lineHeight: 24,
  },
  charCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 5,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  charCountOver: {
    color: Colors.error,
    fontWeight: '600' as const,
  },
  imageRow: {
    gap: 10,
    paddingBottom: 14,
  },
  imageThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inlineUploadTile: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
    gap: 2,
  },
  inlineUploadTileText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  imageThumbnailSelected: {
    borderColor: Colors.accent,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  imageCheck: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  myUploadsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginBottom: 6,
  },
  myUploadsLoadingWrap: {
    width: 44,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDeleteBtn: {
    position: 'absolute' as const,
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removeImageBtn: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
    paddingVertical: 28,
    marginBottom: 14,
    gap: 8,
  },
  addImageText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  mediaTabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mediaTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  mediaTabBtnActive: {
    backgroundColor: Colors.accent,
  },
  mediaTabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  mediaTabTextActive: {
    fontWeight: '600' as const,
    color: '#fff',
  },
  sourceRow: {
    gap: 8,
    paddingBottom: 12,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sourceChipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  sourceChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  sourceChipTextActive: {
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  addImageSubtext: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: -2,
  },
  uploadedVideosSection: {
    marginBottom: 14,
  },
  uploadedVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.teal,
    gap: 10,
  },
  uploadedVideoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    gap: 12,
  },
  uploadVideoTextWrap: {
    flex: 1,
  },
  uploadVideoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  uploadVideoSubtext: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  videoLinkSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  videoLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  videoLinkTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  videoLinkDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 12,
    lineHeight: 17,
  },
  videoLinkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoLinkInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  videoLinkAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLinkAddBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  videoLinkError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  supportedPlatforms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  supportedLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  platformBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  addedLinksSection: {
    marginBottom: 14,
  },
  addedLinksTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  addedLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: 10,
  },
  addedLinkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedLinkMeta: {
    flex: 1,
  },
  addedLinkPlatform: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  addedLinkUrl: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  addedLinkRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsCard: {
    backgroundColor: Colors.accentLight,
    borderRadius: 14,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    marginBottom: 10,
    letterSpacing: 0,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  // ---- Offer / Event form sections (adapted from create-offer.tsx) ----
  formSection: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  paperInput: {
    backgroundColor: '#fff',
    marginBottom: 4,
    fontSize: 15,
  },
  paperMultiline: {
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 2,
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '500' as const,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: Colors.navyDark,
    borderColor: Colors.navyDark,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  pillTextSelected: {
    color: '#fff',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  discountIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountInputWrap: {
    flex: 1,
  },
  imagePreviewWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    backgroundColor: '#fff',
    minHeight: 56,
  },
  dateBtnError: { borderColor: Colors.error },
  dateBtnText: { fontSize: 14, color: Colors.text, flex: 1 },
  dateBtnPlaceholder: { color: Colors.textTertiary },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeToggleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textTertiary,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  activeToggleDotOn: {
    backgroundColor: '#22C55E',
    borderColor: '#BBF7D0',
  },
  activeToggleLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  activeToggleSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  eventToggleRow: {
    flexDirection: 'row',
    gap: 20,
  },
  eventToggleCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  eventToggleLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  eventToggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.borderLight,
    padding: 3,
    justifyContent: 'center',
  },
  eventToggleTrackOn: {
    backgroundColor: Colors.accent,
  },
  eventToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  eventToggleThumbOn: {
    alignSelf: 'flex-end',
  },
});
