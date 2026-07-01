import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TextInput, Switch, Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  X,
  ImagePlus,
  Calendar,
  MapPin,
  Percent,
  Zap,
  Tag,
  Megaphone,
  Sparkles,
  Check,
  Trash2,
  FileText,
} from 'lucide-react-native';
import { DatePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import { usePosts } from '@/hooks/usePosts';
import { uploadPostImage } from '@/api/services/postsService';
import { createOffer, uploadOfferImage, type CreateOfferPayload } from '@/api/services/offersService';
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
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const PURPLE_DARK = '#1A5C35';
const PURPLE_GLOW = 'rgba(83,52,183,0.35)';
const CARD_SHADOW = 'rgba(26,92,53,0.08)';

type TabMode = 'offer' | 'event' | 'post';
type OfferType = 'promotion' | 'discount' | 'flash_sale';

interface FormErrors {
  title?: string;
  description?: string;
  discount?: string;
  startDate?: string;
  endDate?: string;
  eventTitle?: string;
  eventDate?: string;
  eventEndDate?: string;
  postTitle?: string;
  postContent?: string;
}

const OFFER_TYPES: { value: OfferType; label: string; icon: typeof Megaphone }[] = [
  { value: 'promotion', label: 'Promotion', icon: Megaphone },
  { value: 'discount', label: 'Discount', icon: Percent },
  { value: 'flash_sale', label: 'Flash Sale', icon: Zap },
];

export default function CreateOfferScreen() {
  const router = useRouter();
  const publishScale = useRef(new Animated.Value(1)).current;

  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabMode>(
    (tab === 'event' ? 'event' : tab === 'post' ? 'post' : 'offer') as TabMode,
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const [postTitle, setPostTitle]     = useState<string>('');
  const [postContent, setPostContent] = useState<string>('');
  const [postImage, setPostImage]     = useState<string>('');
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);

  const [offerTitle, setOfferTitle] = useState<string>('');
  const [offerDescription, setOfferDescription] = useState<string>('');
  const [offerType, setOfferType] = useState<OfferType>('promotion');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [offerImage, setOfferImage] = useState<string>('');
  const [offerStartDate, setOfferStartDate] = useState<string>('');
  const [offerEndDate, setOfferEndDate] = useState<string>('');
  const [pickerField, setPickerField] = useState<'start' | 'end' | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);

  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
  const [eventDateOpen, setEventDateOpen] = useState<boolean>(false);
  const [eventEndDateOpen, setEventEndDateOpen] = useState<boolean>(false);

  const { addEvent } = useEvents();

  const tabIndicatorAnim = useRef(
    new Animated.Value(activeTab === 'offer' ? 0 : activeTab === 'event' ? 1 : 2),
  ).current;

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const handleTabChange = useCallback((value: TabMode) => {
    setActiveTab(value);
    clearErrors();
    setOfferImage(''); // clear shared offer/event image on every tab switch
    setPostImage('');  // clear post image too
    if (value === 'offer') {
      setEventTitle(''); setEventDescription(''); setEventLocation('');
      setEventDate(null); setEventEndDate(null);
      setPostTitle(''); setPostContent('');
    } else if (value === 'event') {
      setOfferTitle(''); setOfferDescription(''); setOfferType('promotion');
      setDiscountPercent(''); setOfferStartDate(''); setOfferEndDate('');
      setIsActive(true);
      setPostTitle(''); setPostContent('');
    } else {
      setOfferTitle(''); setOfferDescription(''); setOfferType('promotion');
      setDiscountPercent(''); setOfferStartDate(''); setOfferEndDate('');
      setIsActive(true);
      setEventTitle(''); setEventDescription(''); setEventLocation('');
      setEventDate(null); setEventEndDate(null);
    }
    Animated.spring(tabIndicatorAnim, {
      toValue: value === 'offer' ? 0 : value === 'event' ? 1 : 2,
      useNativeDriver: false,
      speed: 20,
      bounciness: 2,
    }).start();
  }, [clearErrors, tabIndicatorAnim]);

  const { addPost } = usePosts();

  const validatePostForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!postTitle.trim()) newErrors.postTitle = 'Title is required';
    if (!postContent.trim()) newErrors.postContent = 'Content is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [postTitle, postContent]);

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
        if (activeTab === 'post') setPostImage(stable);
        else setOfferImage(stable);
        if (__DEV__) console.log('[CreateOffer] Image selected:', stable);
      }
    } catch (err) {
      console.log('[CreateOffer] Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [activeTab]);

  const handleRemoveImage = useCallback(() => {
    setOfferImage('');
  }, []);

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
    if (eventDate && eventEndDate && eventEndDate <= eventDate) {
      newErrors.eventEndDate = 'End date must be after event date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [eventTitle, eventDate, eventEndDate]);

  const handlePublishPressIn = useCallback(() => {
    Animated.spring(publishScale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [publishScale]);

  const handlePublishPressOut = useCallback(() => {
    Animated.spring(publishScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [publishScale]);

  const handlePublish = useCallback(async () => {
    if (activeTab === 'post') {
      if (!validatePostForm()) return;
      try {
        setPublishing(true);
        const post = await addPost({ title: postTitle.trim(), content: postContent.trim() });
        if (postImage) await uploadPostImage(post.id, postImage);
        setSnackbarVisible(true);
        setTimeout(() => router.back(), 1200);
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create post');
      } finally {
        setPublishing(false);
      }
      return;
    }
    if (activeTab === 'offer') {
      if (!validateOfferForm()) return;

      const payload: CreateOfferPayload = {
        title:          offerTitle.trim(),
        description:    offerDescription.trim() || null,
        discount_type:  offerType === 'discount' ? 'percent' : null,
        discount_value: offerType === 'discount' && discountPercent
                          ? parseInt(discountPercent, 10)
                          : null,
        starts_at:      offerStartDate
                          ? new Date(offerStartDate).toISOString()
                          : null,
        expires_at:     offerEndDate
                          ? new Date(offerEndDate).toISOString()
                          : null,
        status:         isActive ? 'active' : 'disabled',
      };

      try {
        setPublishing(true);
        const offer = await createOffer(payload);
        if (offerImage) await uploadOfferImage(offer.id, offerImage);
        setSnackbarVisible(true);
        setTimeout(() => router.back(), 1200);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create offer';
        Alert.alert('Error', msg);
      } finally {
        setPublishing(false);
      }
    } else {
      if (!validateEventForm()) return;
      try {
        setPublishing(true);
        const event = await addEvent({
          title:       eventTitle.trim(),
          description: eventDescription.trim() || null,
          location:    eventLocation.trim() || null,
          starts_at:   eventDate!.toISOString(),
          ends_at:     eventEndDate ? eventEndDate.toISOString() : null,
        });
        if (offerImage) await uploadEventImage(event.id, offerImage);
        setSnackbarVisible(true);
        setTimeout(() => router.back(), 1200);
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create event');
      } finally {
        setPublishing(false);
      }
    }
  }, [
    activeTab, validateOfferForm, validateEventForm, validatePostForm, router,
    offerTitle, offerDescription, offerType, discountPercent, offerImage,
    offerStartDate, offerEndDate, isActive,
    eventTitle, eventDescription, eventLocation, eventDate, eventEndDate, addEvent,
    postTitle, postContent, postImage, addPost,
  ]);

  const renderSectionHeader = (icon: React.ReactNode, title: string) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconBadge}>
        {icon}
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
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
            <IconComp size={14} color={isSelected ? '#fff' : PURPLE} />
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );


  const renderOfferForm = () => (
    <>
      <View style={styles.section}>
        {renderSectionHeader(<Tag size={14} color="#fff" />, 'Offer Details')}

        <TextInput
          label="Title"
          value={offerTitle}
          onChangeText={(t) => { setOfferTitle(t); if (errors.title) setErrors(prev => ({ ...prev, title: undefined })); }}
          mode="outlined"
          style={styles.input}
          outlineColor={errors.title ? Colors.error : '#E8E4F0'}
          activeOutlineColor={PURPLE}
          error={!!errors.title}
          testID="offer-title-input"
          placeholder="e.g. Summer Special 20% Off"
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <TextInput
          label="Description"
          value={offerDescription}
          onChangeText={(t) => { setOfferDescription(t); if (errors.description) setErrors(prev => ({ ...prev, description: undefined })); }}
          mode="outlined"
          style={[styles.input, styles.multilineInput]}
          outlineColor={errors.description ? Colors.error : '#E8E4F0'}
          activeOutlineColor={PURPLE}
          error={!!errors.description}
          multiline
          numberOfLines={4}
          testID="offer-description-input"
          placeholder="Describe your offer..."
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<Sparkles size={14} color="#fff" />, 'Offer Type')}
        {renderOfferTypePills()}

        {offerType === 'discount' && (
          <View style={styles.discountRow}>
            <View style={styles.discountIconWrap}>
              <Percent size={18} color="#fff" />
            </View>
            <View style={styles.discountInputWrap}>
              <TextInput
                label="Discount %"
                value={discountPercent}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '');
                  setDiscountPercent(cleaned);
                  if (errors.discount) setErrors(prev => ({ ...prev, discount: undefined }));
                }}
                mode="outlined"
                style={styles.discountInput}
                outlineColor={errors.discount ? Colors.error : '#E8E4F0'}
                activeOutlineColor={PURPLE}
                error={!!errors.discount}
                keyboardType="numeric"
                maxLength={3}
                testID="discount-percent-input"
                placeholder="e.g. 25"
                right={<TextInput.Affix text="%" />}
                theme={{ colors: { background: '#fff' } }}
              />
            </View>
          </View>
        )}
        {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<ImagePlus size={14} color="#fff" />, 'Cover Image')}

        {offerImage ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: offerImage }} style={styles.imagePreview} contentFit="cover" />
            <TouchableOpacity style={styles.imageRemoveBtn} onPress={handleRemoveImage} activeOpacity={0.7}>
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imageUploadArea}
            onPress={handlePickImage}
            activeOpacity={0.7}
            testID="image-upload-area"
          >
            <View style={styles.imageUploadIconWrap}>
              <ImagePlus size={26} color={PURPLE} />
            </View>
            <Text style={styles.imageUploadTitle}>Tap to upload image</Text>
            <Text style={styles.imageUploadSub}>JPG, PNG up to 10MB</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<Calendar size={14} color="#fff" />, 'Schedule')}

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <TouchableOpacity
              style={[styles.dateBtn, !!errors.startDate && styles.dateBtnError]}
              onPress={() => setPickerField('start')}
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
              onPress={() => setPickerField('end')}
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
          visible={pickerField !== null}
          onDismiss={() => setPickerField(null)}
          date={
            pickerField === 'start'
              ? (offerStartDate ? new Date(offerStartDate) : undefined)
              : (offerEndDate ? new Date(offerEndDate) : undefined)
          }
          onConfirm={({ date }) => {
            if (!date) { setPickerField(null); return; }
            const iso = date.toISOString();
            if (pickerField === 'start') {
              setOfferStartDate(iso);
              setErrors(prev => ({ ...prev, startDate: undefined }));
            } else {
              setOfferEndDate(iso);
              setErrors(prev => ({ ...prev, endDate: undefined }));
            }
            setPickerField(null);
          }}
          validRange={
            pickerField === 'end' && offerStartDate
              ? { startDate: new Date(offerStartDate) }
              : undefined
          }
        />
      </View>

      <View style={styles.section}>
        <View style={styles.activeToggleRow}>
          <View style={styles.activeToggleLeft}>
            <View style={[styles.activeToggleDot, isActive && styles.activeToggleDotOn]} />
            <View>
              <Text style={styles.activeToggleLabel}>Active</Text>
              <Text style={styles.activeToggleSub}>
                {isActive ? 'Offer is visible to subscribers' : 'Offer is saved as draft'}
              </Text>
            </View>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            color={PURPLE}
            testID="active-toggle"
          />
        </View>
      </View>
    </>
  );

  const renderPostForm = () => (
    <>
      <View style={styles.section}>
        {renderSectionHeader(<ImagePlus size={14} color="#fff" />, 'Cover Image')}

        {postImage ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: postImage }} style={styles.imagePreview} contentFit="cover" />
            <TouchableOpacity
              style={styles.imageRemoveBtn}
              onPress={() => setPostImage('')}
              activeOpacity={0.7}
              testID="post-image-remove"
            >
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imageUploadArea}
            onPress={handlePickImage}
            activeOpacity={0.7}
            testID="post-image-upload-area"
          >
            <View style={styles.imageUploadIconWrap}>
              <ImagePlus size={26} color={PURPLE} />
            </View>
            <Text style={styles.imageUploadTitle}>Tap to upload image</Text>
            <Text style={styles.imageUploadSub}>JPG, PNG up to 10MB</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<FileText size={14} color="#fff" />, 'Post Details')}

        <TextInput
          label="Title *"
          value={postTitle}
          onChangeText={(t) => { setPostTitle(t); if (errors.postTitle) setErrors(prev => ({ ...prev, postTitle: undefined })); }}
          mode="outlined"
          style={styles.input}
          outlineColor={errors.postTitle ? Colors.error : '#E8E4F0'}
          activeOutlineColor={PURPLE}
          error={!!errors.postTitle}
          testID="post-title-input"
          placeholder="e.g. We're now open on Sundays!"
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.postTitle && <Text style={styles.errorText}>{errors.postTitle}</Text>}

        <TextInput
          label="Content *"
          value={postContent}
          onChangeText={(t) => { setPostContent(t); if (errors.postContent) setErrors(prev => ({ ...prev, postContent: undefined })); }}
          mode="outlined"
          style={[styles.input, styles.multilineInput]}
          outlineColor={errors.postContent ? Colors.error : '#E8E4F0'}
          activeOutlineColor={PURPLE}
          error={!!errors.postContent}
          multiline
          numberOfLines={4}
          testID="post-content-input"
          placeholder="Share an update, announcement, or moment with your subscribers..."
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.postContent && <Text style={styles.errorText}>{errors.postContent}</Text>}
      </View>
    </>
  );

  const renderEventForm = () => (
    <>
      <View style={styles.section}>
        {renderSectionHeader(<ImagePlus size={14} color="#fff" />, 'Cover Image')}

        {offerImage ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: offerImage }} style={styles.imagePreview} contentFit="cover" />
            <TouchableOpacity style={styles.imageRemoveBtn} onPress={handleRemoveImage} activeOpacity={0.7}>
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imageUploadArea}
            onPress={handlePickImage}
            activeOpacity={0.7}
            testID="event-image-upload-area"
          >
            <View style={styles.imageUploadIconWrap}>
              <ImagePlus size={26} color={PURPLE} />
            </View>
            <Text style={styles.imageUploadTitle}>Tap to upload image</Text>
            <Text style={styles.imageUploadSub}>JPG, PNG up to 10MB</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<Tag size={14} color="#fff" />, 'Event Details')}

        <TextInput
          label="Title *"
          value={eventTitle}
          onChangeText={(t) => { setEventTitle(t); if (errors.eventTitle) setErrors(prev => ({ ...prev, eventTitle: undefined })); }}
          mode="outlined"
          style={styles.input}
          outlineColor={errors.eventTitle ? Colors.error : '#E8E4F0'}
          activeOutlineColor={PURPLE}
          error={!!errors.eventTitle}
          testID="event-title-input"
          placeholder="e.g. Grand Opening Celebration"
          theme={{ colors: { background: '#fff' } }}
        />
        {errors.eventTitle && <Text style={styles.errorText}>{errors.eventTitle}</Text>}

        <TextInput
          label="Description"
          value={eventDescription}
          onChangeText={setEventDescription}
          mode="outlined"
          style={[styles.input, styles.multilineInput]}
          outlineColor="#E8E4F0"
          activeOutlineColor={PURPLE}
          multiline
          numberOfLines={4}
          testID="event-description-input"
          placeholder="Tell attendees what to expect..."
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<MapPin size={14} color="#fff" />, 'Location')}

        <TextInput
          label="Location"
          value={eventLocation}
          onChangeText={setEventLocation}
          mode="outlined"
          style={styles.input}
          outlineColor="#E8E4F0"
          activeOutlineColor={PURPLE}
          testID="event-location-input"
          placeholder="Venue name or address"
          left={<TextInput.Icon icon={() => <MapPin size={15} color={Colors.textSecondary} />} />}
          theme={{ colors: { background: '#fff' } }}
        />
      </View>

      <View style={styles.section}>
        {renderSectionHeader(<Calendar size={14} color="#fff" />, 'Date & Time')}

        <TouchableOpacity
          style={[styles.dateBtn, !!errors.eventDate && styles.dateBtnError]}
          onPress={() => setEventDateOpen(true)}
          testID="event-start-date-btn"
          activeOpacity={0.7}
        >
          <Calendar size={15} color={Colors.textSecondary} />
          <Text style={[styles.dateBtnText, !eventDate && styles.dateBtnPlaceholder]}>
            {eventDate ? format(eventDate, 'd MMM yyyy, HH:mm') : 'Event date & time *'}
          </Text>
        </TouchableOpacity>
        {errors.eventDate && <Text style={styles.errorText}>{errors.eventDate}</Text>}

        <TouchableOpacity
          style={[styles.dateBtn, { marginTop: 10 }, !!errors.eventEndDate && styles.dateBtnError]}
          onPress={() => setEventEndDateOpen(true)}
          testID="event-end-date-btn"
          activeOpacity={0.7}
        >
          <Calendar size={15} color={Colors.textSecondary} />
          <Text style={[styles.dateBtnText, !eventEndDate && styles.dateBtnPlaceholder]}>
            {eventEndDate ? format(eventEndDate, 'd MMM yyyy, HH:mm') : 'End date & time (optional)'}
          </Text>
        </TouchableOpacity>
        {eventEndDate && (
          <TouchableOpacity onPress={() => { setEventEndDate(null); setErrors(p => ({ ...p, eventEndDate: undefined })); }} style={styles.clearDateBtn}>
            <X size={14} color={Colors.textSecondary} />
            <Text style={styles.clearDateText}>Clear end date</Text>
          </TouchableOpacity>
        )}
        {errors.eventEndDate && <Text style={styles.errorText}>{errors.eventEndDate}</Text>}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerDecorCircle1} />
          <View style={styles.headerDecorCircle2} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="close-create-offer" activeOpacity={0.7}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Content</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tabToggleWrap}>
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
              <Pressable
                style={styles.tabBtn}
                onPress={() => handleTabChange('offer')}
                testID="tab-offer"
              >
                <Tag size={14} color={activeTab === 'offer' ? '#fff' : PURPLE} />
                <Text style={[styles.tabBtnText, activeTab === 'offer' && styles.tabBtnTextActive]}>
                  Offer
                </Text>
              </Pressable>
              <Pressable
                style={styles.tabBtn}
                onPress={() => handleTabChange('event')}
                testID="tab-event"
              >
                <Calendar size={14} color={activeTab === 'event' ? '#fff' : PURPLE} />
                <Text style={[styles.tabBtnText, activeTab === 'event' && styles.tabBtnTextActive]}>
                  Event
                </Text>
              </Pressable>
              <Pressable
                style={styles.tabBtn}
                onPress={() => handleTabChange('post')}
                testID="tab-post"
              >
                <FileText size={14} color={activeTab === 'post' ? '#fff' : PURPLE} />
                <Text style={[styles.tabBtnText, activeTab === 'post' && styles.tabBtnTextActive]}>
                  Post
                </Text>
              </Pressable>
            </View>
          </View>

          {activeTab === 'offer'
            ? renderOfferForm()
            : activeTab === 'event'
            ? renderEventForm()
            : renderPostForm()}

          <Animated.View style={[styles.publishWrap, { transform: [{ scale: publishScale }] }]}>
            <Pressable
              style={[
                styles.publishBtn,
                publishing ? styles.publishBtnDisabled : undefined,
              ]}
              onPress={handlePublish}
              onPressIn={handlePublishPressIn}
              onPressOut={handlePublishPressOut}
              disabled={publishing}
              testID="publish-btn"
            >
              {publishing ? (
                <View style={styles.publishInner}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={styles.publishInner}>
                  <Check size={18} color="#fff" />
                  <Text style={styles.publishLabel}>
                    {activeTab === 'offer' ? 'Create Offer' : activeTab === 'event' ? 'Create Event' : 'Create Post'}
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {activeTab === 'offer' ? 'Offer created!' : activeTab === 'event' ? 'Event created!' : 'Post created!'}
      </Snackbar>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={eventDateOpen}
        onDismiss={() => setEventDateOpen(false)}
        date={eventDate ?? undefined}
        onConfirm={({ date }) => {
          if (date) { setEventDate(date); setErrors(p => ({ ...p, eventDate: undefined })); }
          setEventDateOpen(false);
        }}
        saveLabel="Confirm"
      />

      <DatePickerModal
        locale="en"
        mode="single"
        visible={eventEndDateOpen}
        onDismiss={() => setEventEndDateOpen(false)}
        date={eventEndDate ?? undefined}
        validRange={eventDate ? { startDate: eventDate } : undefined}
        onConfirm={({ date }) => {
          if (date) { setEventEndDate(date); setErrors(p => ({ ...p, eventEndDate: undefined })); }
          setEventEndDateOpen(false);
        }}
        saveLabel="Confirm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
  },
  flex: {
    flex: 1,
  },
  headerWrap: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerSafe: {
    paddingBottom: 4,
  },
  headerDecorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -30,
    right: -20,
  },
  headerDecorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -10,
    left: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 38,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabToggleWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 14,
    padding: 3,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '32%',
    backgroundColor: PURPLE,
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
    color: PURPLE,
    letterSpacing: -0.2,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: CARD_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
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
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1A1730',
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 4,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 100,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 10,
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
    backgroundColor: PURPLE_LIGHT,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: PURPLE,
    borderColor: PURPLE_DARK,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: PURPLE_DARK,
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
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountInputWrap: {
    flex: 1,
  },
  discountInput: {
    backgroundColor: '#fff',
    fontSize: 15,
  },
  imageUploadArea: {
    borderWidth: 2,
    borderColor: PURPLE_LIGHT,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8FF',
  },
  imageUploadIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: PURPLE + '20',
  },
  imageUploadTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1730',
  },
  imageUploadSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 3,
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
    borderColor: '#E8E4F0',
    borderRadius: 4,
    backgroundColor: '#fff',
    minHeight: 56,
  },
  dateBtnError: { borderColor: Colors.error },
  dateBtnText: { fontSize: 14, color: '#0F1115', flex: 1 },
  dateBtnPlaceholder: { color: '#9CA3AF' },
  clearDateBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    alignSelf: 'flex-start' as const,
    paddingVertical: 4,
    marginTop: 6,
  },
  clearDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
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
    borderColor: '#E8E4F0',
  },
  activeToggleDotOn: {
    backgroundColor: '#22C55E',
    borderColor: '#BBF7D0',
  },
  activeToggleLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1730',
  },
  activeToggleSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  publishWrap: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  publishBtn: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    shadowColor: PURPLE_GLOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  publishBtnDisabled: {
    backgroundColor: '#E8F5EE',
    shadowOpacity: 0,
    elevation: 0,
  },
  postSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -8,
    marginBottom: 14,
  },
  charCounter: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right' as const,
    marginTop: 4,
    marginRight: 4,
    fontWeight: '500' as const,
  },
  addPhotoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PURPLE_LIGHT,
    borderStyle: 'dashed',
    backgroundColor: '#FAF8FF',
  },
  addPhotoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1730',
  },
  snackbar: {
    backgroundColor: '#1A1730',
    marginBottom: 24,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  publishInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  publishLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 40,
  },
});
