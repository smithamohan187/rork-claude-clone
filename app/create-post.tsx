import React, { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  Camera,
  FolderOpen,
  Globe,
  Upload,
  Play,
  Film,
  Link,
  ExternalLink,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Tag,
  DollarSign,
  Users,
  Flame,
  Plus,
  Edit3,
} from 'lucide-react-native';
import type { LocalEvent } from '@/mocks/data';
import { mockLocalEvents } from '@/mocks/data';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type PostType = 'promotion' | 'announcement' | 'general';

const POST_TYPE_OPTIONS: { value: PostType; label: string; icon: 'megaphone' | 'bell' | 'file' }[] = [
  { value: 'promotion', label: 'Promotion', icon: 'megaphone' },
  { value: 'announcement', label: 'Announcement', icon: 'bell' },
  { value: 'general', label: 'General', icon: 'file' },
];

type MediaSource = 'stock' | 'products' | 'branding' | 'lifestyle';

const MEDIA_SOURCES: { key: MediaSource; label: string; icon: 'globe' | 'folder' | 'camera' | 'image' }[] = [
  { key: 'stock', label: 'Stock Photos', icon: 'globe' },
  { key: 'products', label: 'Product Shots', icon: 'camera' },
  { key: 'branding', label: 'Branding', icon: 'folder' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'image' },
];

const IMAGE_LIBRARY: Record<MediaSource, string[]> = {
  stock: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
  ],
  products: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=400&fit=crop',
  ],
  branding: [
    'https://images.unsplash.com/photo-1556740758-90de940e0603?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1556741533-411cf82e4e2d?w=600&h=400&fit=crop',
  ],
  lifestyle: [
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
  ],
};

const SAMPLE_VIDEOS = [
  { id: 'v1', title: 'Product Showcase', duration: '0:30', thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=300&h=200&fit=crop' },
  { id: 'v2', title: 'Behind the Scenes', duration: '1:15', thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&h=200&fit=crop' },
  { id: 'v3', title: 'Customer Testimonial', duration: '0:45', thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=300&h=200&fit=crop' },
  { id: 'v4', title: 'Brand Story', duration: '2:00', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=200&fit=crop' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const { currentUser, accountType } = useAuth();
  const [content, setContent] = useState<string>('');
  const [selectedType, setSelectedType] = useState<PostType>('general');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
  const [activeMediaSource, setActiveMediaSource] = useState<MediaSource>('stock');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [mediaTab, setMediaTab] = useState<'images' | 'videos'>('images');
  const [videoLink, setVideoLink] = useState<string>('');
  const [videoLinkError, setVideoLinkError] = useState<string>('');
  const [addedVideoLinks, setAddedVideoLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadedVideos, setUploadedVideos] = useState<{ uri: string; fileName: string; duration: number | null }[]>([]);
  const successAnim = useRef(new Animated.Value(0)).current;

  const isBusiness = accountType === 'business';

  const [showEventForm, setShowEventForm] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventCategory, setEventCategory] = useState<LocalEvent['category']>('community');
  const [eventIsFree, setEventIsFree] = useState<boolean>(true);
  const [eventPrice, setEventPrice] = useState<string>('');
  const [eventTags, setEventTags] = useState<string>('');
  const [eventIsHot, setEventIsHot] = useState<boolean>(false);
  const [existingEvents, setExistingEvents] = useState<LocalEvent[]>(
    mockLocalEvents.filter(e => e.host === currentUser.name).slice(0, 3)
  );
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);

  const isFormValid = content.trim().length > 0;

  const charCount = content.length;
  const MAX_CHARS = 500;

  const EVENT_CATEGORIES: { value: LocalEvent['category']; label: string; emoji: string }[] = [
    { value: 'food', label: 'Food & Drink', emoji: '🍽️' },
    { value: 'fitness', label: 'Fitness', emoji: '💪' },
    { value: 'music', label: 'Music', emoji: '🎵' },
    { value: 'art', label: 'Art & Culture', emoji: '🎨' },
    { value: 'community', label: 'Community', emoji: '🤝' },
    { value: 'wellness', label: 'Wellness', emoji: '🧘' },
    { value: 'market', label: 'Market', emoji: '🛍️' },
    { value: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  ];

  const EVENT_IMAGES: Record<LocalEvent['category'], string> = {
    food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop',
    fitness: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop',
    music: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&h=400&fit=crop',
    art: 'https://images.unsplash.com/photo-1523694576729-dc99ef1b0632?w=600&h=400&fit=crop',
    community: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=400&fit=crop',
    wellness: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop',
    market: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop',
    nightlife: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&h=400&fit=crop',
  };

  const resetEventForm = useCallback(() => {
    setEventTitle('');
    setEventDescription('');
    setEventDate('');
    setEventTime('');
    setEventLocation('');
    setEventCategory('community');
    setEventIsFree(true);
    setEventPrice('');
    setEventTags('');
    setEventIsHot(false);
    setEditingEventId(null);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!eventTitle.trim() || !eventDate.trim() || !eventTime.trim() || !eventLocation.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the event title, date, time, and location.');
      return;
    }

    const tagsArray = eventTags.split(',').map(t => t.trim()).filter(Boolean);
    const newEvent: LocalEvent = {
      id: editingEventId || `evt_new_${Date.now()}`,
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      image: EVENT_IMAGES[eventCategory],
      date: eventDate.trim(),
      time: eventTime.trim(),
      location: eventLocation.trim(),
      category: eventCategory,
      host: currentUser.name,
      hostAvatar: currentUser.avatar,
      attendees: editingEventId ? (existingEvents.find(e => e.id === editingEventId)?.attendees ?? 0) : 0,
      isFree: eventIsFree,
      price: eventIsFree ? undefined : eventPrice.trim(),
      tags: tagsArray.length > 0 ? tagsArray : [EVENT_CATEGORIES.find(c => c.value === eventCategory)?.label ?? 'Event'],
      isHot: eventIsHot,
    };

    if (editingEventId) {
      setExistingEvents(prev => prev.map(e => e.id === editingEventId ? newEvent : e));
      console.log('Updated event:', newEvent);
      Alert.alert('Event Updated', `"${newEvent.title}" has been updated and will appear on the community newsfeed.`);
    } else {
      setExistingEvents(prev => [newEvent, ...prev]);
      console.log('Created new event:', newEvent);
      Alert.alert('Event Created', `"${newEvent.title}" will now appear on the community newsfeed.`);
    }

    resetEventForm();
    setShowEventForm(false);
  }, [eventTitle, eventDescription, eventDate, eventTime, eventLocation, eventCategory, eventIsFree, eventPrice, eventTags, eventIsHot, editingEventId, existingEvents, currentUser, resetEventForm]);

  const handleEditEvent = useCallback((event: LocalEvent) => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDescription(event.description);
    setEventDate(event.date);
    setEventTime(event.time);
    setEventLocation(event.location);
    setEventCategory(event.category);
    setEventIsFree(event.isFree);
    setEventPrice(event.price ?? '');
    setEventTags(event.tags.join(', '));
    setEventIsHot(event.isHot ?? false);
    setShowEventForm(true);
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to remove this event from the newsfeed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setExistingEvents(prev => prev.filter(e => e.id !== eventId));
          console.log('Deleted event:', eventId);
        },
      },
    ]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isFormValid) {
      Alert.alert('Missing Content', 'Please write something for your post.');
      return;
    }
    if (charCount > MAX_CHARS) {
      Alert.alert('Too Long', `Please keep your post under ${MAX_CHARS} characters.`);
      return;
    }

    setIsSubmitting(true);
    console.log('Creating post:', { content, selectedType, selectedImage, selectedVideo, addedVideoLinks, uploadedVideos });

    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(800),
    ]).start(() => {
      Alert.alert(
        'Post Published!',
        'Your post is now live on the feed.',
        [{ text: 'Great', onPress: () => router.back() }]
      );
    });
  }, [isFormValid, content, selectedType, selectedImage, selectedVideo, addedVideoLinks, uploadedVideos, successAnim, router, charCount]);

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
    if (addedVideoLinks.includes(trimmed)) {
      setVideoLinkError('This video has already been added');
      return;
    }
    setAddedVideoLinks((prev) => [...prev, trimmed]);
    setVideoLink('');
    setVideoLinkError('');
    setSelectedVideo('');
    console.log('Added video link:', trimmed);
  }, [videoLink, addedVideoLinks, isValidVideoUrl]);

  const handleRemoveVideoLink = useCallback((url: string) => {
    setAddedVideoLinks((prev) => prev.filter((l) => l !== url));
  }, []);

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
        const fileName = asset.fileName || asset.uri.split('/').pop() || 'video';
        const duration = asset.duration ? Math.round(asset.duration / 1000) : null;
        setUploadedVideos((prev) => [...prev, { uri: asset.uri, fileName, duration }]);
        setSelectedVideo('');
        console.log('Uploaded video from device:', { uri: asset.uri, fileName, duration });
      }
    } catch (error) {
      console.log('Video upload error:', error);
      Alert.alert('Upload Failed', 'Something went wrong while selecting the video. Please try again.');
    }
  }, []);

  const handleRemoveUploadedVideo = useCallback((uri: string) => {
    setUploadedVideos((prev) => prev.filter((v) => v.uri !== uri));
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="close-create-post">
            <X size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            style={[styles.publishBtn, !isFormValid && styles.publishBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            testID="publish-post"
          >
            <Text style={[styles.publishText, !isFormValid && styles.publishTextDisabled]}>Post</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isSubmitting ? (
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={48} color={Colors.navyDark} />
          </Animated.View>
          <Text style={styles.successText}>Publishing your post...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.authorRow}>
              <Image source={{ uri: currentUser.avatar }} style={styles.authorAvatar} />
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>{currentUser.name}</Text>
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
                <Text style={[
                  styles.charCount,
                  charCount > MAX_CHARS && styles.charCountOver,
                ]}>
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
                <ImagePlus size={16} color={mediaTab === 'images' ? Colors.navyDark : Colors.textTertiary} />
                <Text style={[styles.mediaTabText, mediaTab === 'images' && styles.mediaTabTextActive]}>Images</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaTabBtn, mediaTab === 'videos' && styles.mediaTabBtnActive]}
                onPress={() => setMediaTab('videos')}
                activeOpacity={0.7}
              >
                <Film size={16} color={mediaTab === 'videos' ? Colors.navyDark : Colors.textTertiary} />
                <Text style={[styles.mediaTabText, mediaTab === 'videos' && styles.mediaTabTextActive]}>Videos</Text>
              </TouchableOpacity>
            </View>

            {mediaTab === 'images' && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sourceRow}
                >
                  {MEDIA_SOURCES.map((source) => {
                    const isActive = activeMediaSource === source.key;
                    const SourceIcon = source.icon === 'globe' ? Globe : source.icon === 'folder' ? FolderOpen : source.icon === 'camera' ? Camera : ImagePlus;
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

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imageRow}
                >
                  {IMAGE_LIBRARY[activeMediaSource].map((img) => (
                    <TouchableOpacity
                      key={img}
                      style={[styles.imageThumbnail, selectedImage === img && styles.imageThumbnailSelected]}
                      onPress={() => {
                        setSelectedImage(selectedImage === img ? '' : img);
                        setSelectedVideo('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img }} style={styles.thumbImage} contentFit="cover" />
                      {selectedImage === img && (
                        <View style={styles.imageCheck}>
                          <Check size={14} color={Colors.navyDark} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedImage ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="cover" />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage('')}>
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addImagePlaceholder} activeOpacity={0.7}>
                    <Upload size={28} color={Colors.textTertiary} />
                    <Text style={styles.addImageText}>Upload from device</Text>
                    <Text style={styles.addImageSubtext}>or select from a source above</Text>
                  </TouchableOpacity>
                )}
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
                  {videoLinkError ? (
                    <Text style={styles.videoLinkError}>{videoLinkError}</Text>
                  ) : null}
                  <View style={styles.supportedPlatforms}>
                    <Text style={styles.supportedLabel}>Supported:</Text>
                    {['YouTube', 'Vimeo', 'TikTok', 'Instagram', 'Facebook', 'MP4/MOV'].map((p) => (
                      <View key={p} style={styles.platformBadge}>
                        <Text style={styles.platformBadgeText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {addedVideoLinks.length > 0 && (
                  <View style={styles.addedLinksSection}>
                    <Text style={styles.addedLinksTitle}>Added Videos ({addedVideoLinks.length})</Text>
                    {addedVideoLinks.map((link) => (
                      <View key={link} style={styles.addedLinkCard}>
                        <View style={styles.addedLinkIconWrap}>
                          <Play size={16} color="#fff" fill="#fff" />
                        </View>
                        <View style={styles.addedLinkMeta}>
                          <Text style={styles.addedLinkPlatform}>{getVideoPlatform(link)}</Text>
                          <Text style={styles.addedLinkUrl} numberOfLines={1}>{link}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addedLinkRemoveBtn}
                          onPress={() => handleRemoveVideoLink(link)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.videoDivider}>
                  <View style={styles.videoDividerLine} />
                  <Text style={styles.videoDividerText}>or choose a sample</Text>
                  <View style={styles.videoDividerLine} />
                </View>

                <View style={styles.videoGrid}>
                  {SAMPLE_VIDEOS.map((video) => {
                    const isActive = selectedVideo === video.id;
                    return (
                      <TouchableOpacity
                        key={video.id}
                        style={[styles.videoCard, isActive && styles.videoCardActive]}
                        onPress={() => {
                          setSelectedVideo(isActive ? '' : video.id);
                          setSelectedImage('');
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.videoThumbWrap}>
                          <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} contentFit="cover" />
                          <View style={styles.videoPlayOverlay}>
                            <Play size={20} color="#fff" fill="#fff" />
                          </View>
                          <View style={styles.videoDurationBadge}>
                            <Text style={styles.videoDurationText}>{video.duration}</Text>
                          </View>
                          {isActive && (
                            <View style={styles.videoCheckOverlay}>
                              <Check size={20} color={Colors.navyDark} />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.videoTitle, isActive && styles.videoTitleActive]} numberOfLines={1}>{video.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {uploadedVideos.length > 0 && (
                  <View style={styles.uploadedVideosSection}>
                    <Text style={styles.addedLinksTitle}>Uploaded from Device ({uploadedVideos.length})</Text>
                    {uploadedVideos.map((vid) => (
                      <View key={vid.uri} style={styles.uploadedVideoCard}>
                        <View style={styles.uploadedVideoIconWrap}>
                          <Film size={16} color="#fff" />
                        </View>
                        <View style={styles.addedLinkMeta}>
                          <Text style={styles.addedLinkPlatform} numberOfLines={1}>{vid.fileName}</Text>
                          <Text style={styles.addedLinkUrl}>Duration: {formatDuration(vid.duration)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addedLinkRemoveBtn}
                          onPress={() => handleRemoveUploadedVideo(vid.uri)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
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

            {isBusiness && (
              <View style={styles.eventSection}>
                <View style={styles.eventSectionHeader}>
                  <View style={styles.eventSectionTitleRow}>
                    <View style={styles.eventIconCircle}>
                      <Calendar size={18} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.eventSectionTitle}>Upcoming Events</Text>
                      <Text style={styles.eventSectionSubtitle}>Manage events on the community newsfeed</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.eventAddBtn}
                    onPress={() => {
                      resetEventForm();
                      setShowEventForm(!showEventForm);
                    }}
                    activeOpacity={0.7}
                    testID="toggle-event-form"
                  >
                    {showEventForm ? (
                      <X size={18} color={Colors.textSecondary} />
                    ) : (
                      <Plus size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {existingEvents.length > 0 && !showEventForm && (
                  <View style={styles.existingEventsList}>
                    {existingEvents.map((event) => {
                      const catInfo = EVENT_CATEGORIES.find(c => c.value === event.category);
                      return (
                        <View key={event.id} style={styles.existingEventCard}>
                          <Image source={{ uri: event.image }} style={styles.existingEventImage} contentFit="cover" />
                          <View style={styles.existingEventContent}>
                            <View style={styles.existingEventTopRow}>
                              <Text style={styles.existingEventTitle} numberOfLines={1}>{event.title}</Text>
                              {event.isHot && (
                                <View style={styles.hotBadgeMini}>
                                  <Flame size={10} color="#F59E0B" />
                                </View>
                              )}
                            </View>
                            <View style={styles.existingEventMeta}>
                              <Calendar size={11} color={Colors.textTertiary} />
                              <Text style={styles.existingEventMetaText}>{event.date}</Text>
                              <MapPin size={11} color={Colors.textTertiary} />
                              <Text style={styles.existingEventMetaText} numberOfLines={1}>{event.location}</Text>
                            </View>
                            <View style={styles.existingEventBottom}>
                              <View style={styles.existingEventCatBadge}>
                                <Text style={styles.existingEventCatText}>{catInfo?.emoji} {catInfo?.label}</Text>
                              </View>
                              <View style={styles.existingEventActions}>
                                <TouchableOpacity
                                  style={styles.existingEventEditBtn}
                                  onPress={() => handleEditEvent(event)}
                                  activeOpacity={0.7}
                                >
                                  <Edit3 size={13} color={Colors.navyDark} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.existingEventDeleteBtn}
                                  onPress={() => handleDeleteEvent(event.id)}
                                  activeOpacity={0.7}
                                >
                                  <Trash2 size={13} color={Colors.error} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {showEventForm && (
                  <View style={styles.eventFormCard}>
                    <Text style={styles.eventFormTitle}>
                      {editingEventId ? 'Edit Event' : 'Create New Event'}
                    </Text>

                    <View style={styles.eventFieldGroup}>
                      <Text style={styles.eventFieldLabel}>Event Title *</Text>
                      <TextInput
                        style={styles.eventInput}
                        placeholder="e.g. Weekend Brunch Special"
                        placeholderTextColor={Colors.textTertiary}
                        value={eventTitle}
                        onChangeText={setEventTitle}
                        testID="event-title-input"
                      />
                    </View>

                    <View style={styles.eventFieldGroup}>
                      <Text style={styles.eventFieldLabel}>Description</Text>
                      <TextInput
                        style={[styles.eventInput, styles.eventInputMultiline]}
                        placeholder="Tell people what to expect..."
                        placeholderTextColor={Colors.textTertiary}
                        value={eventDescription}
                        onChangeText={setEventDescription}
                        multiline
                        textAlignVertical="top"
                        testID="event-description-input"
                      />
                    </View>

                    <View style={styles.eventFieldRow}>
                      <View style={[styles.eventFieldGroup, { flex: 1 }]}>
                        <Text style={styles.eventFieldLabel}>Date *</Text>
                        <View style={styles.eventInputWithIcon}>
                          <Calendar size={15} color={Colors.textTertiary} />
                          <TextInput
                            style={styles.eventInputInner}
                            placeholder="Sat, Mar 15"
                            placeholderTextColor={Colors.textTertiary}
                            value={eventDate}
                            onChangeText={setEventDate}
                            testID="event-date-input"
                          />
                        </View>
                      </View>
                      <View style={[styles.eventFieldGroup, { flex: 1 }]}>
                        <Text style={styles.eventFieldLabel}>Time *</Text>
                        <View style={styles.eventInputWithIcon}>
                          <Clock size={15} color={Colors.textTertiary} />
                          <TextInput
                            style={styles.eventInputInner}
                            placeholder="6:00 PM – 9:00 PM"
                            placeholderTextColor={Colors.textTertiary}
                            value={eventTime}
                            onChangeText={setEventTime}
                            testID="event-time-input"
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.eventFieldGroup}>
                      <Text style={styles.eventFieldLabel}>Location *</Text>
                      <View style={styles.eventInputWithIcon}>
                        <MapPin size={15} color={Colors.textTertiary} />
                        <TextInput
                          style={styles.eventInputInner}
                          placeholder="Your venue or address"
                          placeholderTextColor={Colors.textTertiary}
                          value={eventLocation}
                          onChangeText={setEventLocation}
                          testID="event-location-input"
                        />
                      </View>
                    </View>

                    <View style={styles.eventFieldGroup}>
                      <Text style={styles.eventFieldLabel}>Category</Text>
                      <TouchableOpacity
                        style={styles.eventCategoryPicker}
                        onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.eventCategoryPickerText}>
                          {EVENT_CATEGORIES.find(c => c.value === eventCategory)?.emoji}{' '}
                          {EVENT_CATEGORIES.find(c => c.value === eventCategory)?.label}
                        </Text>
                        <ChevronDown size={16} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      {showCategoryPicker && (
                        <View style={styles.eventCategoryDropdown}>
                          {EVENT_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                              key={cat.value}
                              style={[
                                styles.eventCategoryOption,
                                eventCategory === cat.value && styles.eventCategoryOptionActive,
                              ]}
                              onPress={() => {
                                setEventCategory(cat.value);
                                setShowCategoryPicker(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.eventCategoryOptionEmoji}>{cat.emoji}</Text>
                              <Text style={[
                                styles.eventCategoryOptionText,
                                eventCategory === cat.value && styles.eventCategoryOptionTextActive,
                              ]}>{cat.label}</Text>
                              {eventCategory === cat.value && <Check size={14} color={Colors.navyDark} />}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.eventToggleRow}>
                      <View style={styles.eventToggleGroup}>
                        <Text style={styles.eventToggleLabel}>Free Event</Text>
                        <TouchableOpacity
                          style={[styles.eventToggle, eventIsFree && styles.eventToggleOn]}
                          onPress={() => setEventIsFree(!eventIsFree)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.eventToggleThumb, eventIsFree && styles.eventToggleThumbOn]} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.eventToggleGroup}>
                        <View style={styles.eventToggleLabelRow}>
                          <Flame size={14} color="#F59E0B" />
                          <Text style={styles.eventToggleLabel}>Mark as Hot</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.eventToggle, eventIsHot && styles.eventToggleOnHot]}
                          onPress={() => setEventIsHot(!eventIsHot)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.eventToggleThumb, eventIsHot && styles.eventToggleThumbOnHot]} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!eventIsFree && (
                      <View style={styles.eventFieldGroup}>
                        <Text style={styles.eventFieldLabel}>Ticket Price</Text>
                        <View style={styles.eventInputWithIcon}>
                          <DollarSign size={15} color={Colors.textTertiary} />
                          <TextInput
                            style={styles.eventInputInner}
                            placeholder="25"
                            placeholderTextColor={Colors.textTertiary}
                            value={eventPrice}
                            onChangeText={setEventPrice}
                            keyboardType="numeric"
                            testID="event-price-input"
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.eventFieldGroup}>
                      <Text style={styles.eventFieldLabel}>Tags (comma separated)</Text>
                      <View style={styles.eventInputWithIcon}>
                        <Tag size={15} color={Colors.textTertiary} />
                        <TextInput
                          style={styles.eventInputInner}
                          placeholder="Food, Live Music, Outdoor"
                          placeholderTextColor={Colors.textTertiary}
                          value={eventTags}
                          onChangeText={setEventTags}
                          testID="event-tags-input"
                        />
                      </View>
                    </View>

                    <View style={styles.eventFormActions}>
                      <TouchableOpacity
                        style={styles.eventCancelBtn}
                        onPress={() => {
                          resetEventForm();
                          setShowEventForm(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.eventCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.eventSaveBtn}
                        onPress={handleSaveEvent}
                        activeOpacity={0.7}
                        testID="save-event-btn"
                      >
                        <Calendar size={16} color="#fff" />
                        <Text style={styles.eventSaveText}>
                          {editingEventId ? 'Update Event' : 'Publish Event'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
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

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  publishBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 20,
  },
  publishBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  publishText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.navyDark,
    letterSpacing: 0.1,
  },
  publishTextDisabled: {
    color: Colors.textTertiary,
  },
  form: {
    padding: 20,
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
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
    marginBottom: 20,
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
    color: Colors.navyDark,
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
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  videoCard: {
    width: '48%' as unknown as number,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  videoCardActive: {
    borderColor: Colors.accent,
  },
  videoThumbWrap: {
    width: '100%',
    height: 100,
    position: 'relative' as const,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoDurationBadge: {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  videoCheckOverlay: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  videoTitleActive: {
    fontWeight: '600' as const,
    color: Colors.navyDark,
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
  videoDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  videoDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  videoDividerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
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
  eventSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
    overflow: 'hidden',
  },
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  eventSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  eventIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1B6B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  eventSectionSubtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  eventAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1B6B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingEventsList: {
    padding: 12,
    gap: 10,
  },
  existingEventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  existingEventImage: {
    width: 80,
    height: 90,
  },
  existingEventContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  existingEventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  existingEventTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  hotBadgeMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  existingEventMetaText: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginRight: 6,
  },
  existingEventBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  existingEventCatBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  existingEventCatText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  existingEventActions: {
    flexDirection: 'row',
    gap: 6,
  },
  existingEventEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingEventDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventFormCard: {
    padding: 16,
  },
  eventFormTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  eventFieldGroup: {
    marginBottom: 14,
  },
  eventFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  eventInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  eventInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  eventFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  eventInputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    gap: 8,
  },
  eventInputInner: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  eventCategoryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventCategoryPickerText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  eventCategoryDropdown: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 6,
    overflow: 'hidden',
  },
  eventCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  eventCategoryOptionActive: {
    backgroundColor: '#E8F5EE',
  },
  eventCategoryOptionEmoji: {
    fontSize: 16,
  },
  eventCategoryOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  eventCategoryOptionTextActive: {
    fontWeight: '600' as const,
    color: '#1B6B4A',
  },
  eventToggleRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  eventToggleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eventToggleLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  eventToggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  eventToggleOn: {
    backgroundColor: '#1B6B4A',
  },
  eventToggleOnHot: {
    backgroundColor: '#F59E0B',
  },
  eventToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  eventToggleThumbOn: {
    alignSelf: 'flex-end' as const,
  },
  eventToggleThumbOnHot: {
    alignSelf: 'flex-end' as const,
  },
  eventFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  eventCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  eventSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1B6B4A',
    gap: 8,
  },
  eventSaveText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
});

