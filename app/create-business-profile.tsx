import React, { useState, useRef, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  type ViewToken,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Tag,
  ChevronRight,
  Check,
  Sparkles,
  Store,
  FileText,
  Search,
  ShieldCheck,
  Star,
  PenLine,
  ImagePlus,
  X,
  MessagesSquare,
  Ban,
  Share2,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BUSINESS_CATEGORIES } from '@/constants/businessCategories';
import { useAuth } from '@/contexts/AuthContext';
import { mockBusinessSignUpData, googleBusinessProfiles } from '@/mocks/data';
import {
  getBusinessReferralSettings,
  setBusinessReferralSettings,
  normaliseWebsiteUrl,
} from '@/services/businessReferralRegistry';
import {
  getBusinessTypeSettings,
  setBusinessTypeSettings,
  isValidInhouseReferralUrl,
  type BusinessType,
} from '@/services/businessTypeRegistry';
import { AlertTriangle, Gift, HandHeart, Trophy, Info, Link2 } from 'lucide-react-native';
import BizComSubscription from '@/components/BizComSubscription';
import type { BusinessProfileData } from '@/types';

const CATEGORIES = BUSINESS_CATEGORIES;

const STEPS = [
  { title: 'Business Info', icon: Store },
  { title: 'Contact', icon: Phone },
  { title: 'Details', icon: Tag },
  { title: 'Review', icon: FileText },
  { title: 'Subscribe', icon: Sparkles },
];

const SLIDE_CARD_WIDTH = Dimensions.get('window').width - 32;
const SLIDE_GAP = 12;

const FEATURE_SLIDES = [
  {
    id: 'engage',
    icon: MessagesSquare,
    title: 'Engage Your Real Customers',
    desc: 'A new way to have passive or active dialogue, one-to-one or one-to-many, with your real customers — cutting out the noise of social media.',
  },
  {
    id: 'nospam',
    icon: Ban,
    title: 'No More Spam & Junk',
    desc: 'Reach customers directly through personal feed announcements and posts — never lost in junk mail again.',
  },
  {
    id: 'trust',
    icon: ShieldCheck,
    title: 'Build Trust & Reputation',
    desc: 'Share feedback, ratings, and community intelligence to build lasting trust with every customer.',
  },
  {
    id: 'wom',
    icon: Share2,
    title: 'Word of Mouth Power',
    desc: "Leverage the world's most powerful growth method using our unique goodwill and incentivized referrals engine.",
  },
];

interface LocalBusinessProfileData extends BusinessProfileData {
  businessPhoto: string;
  businessLogo: string;
}

type CreationMethod = 'none' | 'manual' | 'google';

export default function CreateBusinessProfileScreen() {
  const router = useRouter();
  const { completeBusinessProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const formAnchorRef = useRef<View>(null);
  const methodScrollRef = useRef<ScrollView>(null);
  const methodAnchorRef = useRef<View>(null);
  const [creationMethod, setCreationMethod] = useState<CreationMethod>('none');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  const scrollToForm = useCallback(() => {
    formAnchorRef.current?.measureLayout(
      scrollRef.current?.getInnerViewNode?.() as unknown as number ?? -1,
      (_x: number, y: number) => {
        scrollRef.current?.scrollTo({ y: y - 20, animated: true });
      },
      () => {
        scrollRef.current?.scrollTo({ y: 400, animated: true });
      },
    );
  }, []);

  const scrollToMethods = useCallback(() => {
    methodAnchorRef.current?.measureLayout(
      methodScrollRef.current?.getInnerViewNode?.() as unknown as number ?? -1,
      (_x: number, y: number) => {
        methodScrollRef.current?.scrollTo({ y: y - 20, animated: true });
      },
      () => {
        methodScrollRef.current?.scrollTo({ y: 500, animated: true });
      },
    );
  }, []);

  const onSlideViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const first = viewableItems[0];
    if (typeof first.index === 'number') {
      setActiveSlideIndex(first.index);
    }
  }).current;

  const slideViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const [googleSearch, setGoogleSearch] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const methodFadeAnim = useRef(new Animated.Value(1)).current;

  const ownBusinessKey = mockBusinessSignUpData.username || 'self';
  const seededType = getBusinessTypeSettings(ownBusinessKey);

  const [formData, setFormData] = useState<LocalBusinessProfileData>({
    name: mockBusinessSignUpData.name,
    username: mockBusinessSignUpData.username,
    bio: mockBusinessSignUpData.bio,
    avatar: mockBusinessSignUpData.avatar,
    businessPhoto: '',
    businessLogo: '',
    phone: mockBusinessSignUpData.phone,
    email: mockBusinessSignUpData.email,
    website: mockBusinessSignUpData.website,
    address: mockBusinessSignUpData.address,
    category: mockBusinessSignUpData.category,
    hours: mockBusinessSignUpData.hours,
    referralOptIn: getBusinessReferralSettings(ownBusinessKey).optIn,
  });

  const [businessType, setBusinessTypeState] = useState<BusinessType | null>(null);
  const [referralOptedOut, setReferralOptedOut] = useState<boolean>(seededType.referralOptedOut);
  const [inhouseReferralUrl, setInhouseReferralUrl] = useState<string>(seededType.inhouseReferralUrl ?? '');
  const [businessTypeError, setBusinessTypeError] = useState<string>('');
  const [inhouseUrlError, setInhouseUrlError] = useState<string>('');

  const [errors, setErrors] = useState<Partial<Record<keyof LocalBusinessProfileData, string>>>({});

  const updateField = useCallback((field: keyof LocalBusinessProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const pickImage = useCallback(async (field: 'businessPhoto' | 'businessLogo') => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: field === 'businessLogo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });
      console.log('Image picker result:', JSON.stringify(result));
      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Setting image for', field, ':', result.assets[0].uri);
        setFormData(prev => ({ ...prev, [field]: result.assets[0].uri }));
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    }
  }, []);

  const removeImage = useCallback((field: 'businessPhoto' | 'businessLogo') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  }, []);

  const animateProgress = useCallback((step: number) => {
    Animated.spring(progressAnim, {
      toValue: step / (STEPS.length - 1),
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();
  }, [progressAnim]);

  const animateTransition = useCallback((callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Partial<Record<keyof LocalBusinessProfileData, string>> = {};

    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = 'Business name is required';
      if (!formData.username.trim()) newErrors.username = 'Username is required';
      if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Only letters, numbers, and underscores';
      }
    } else if (step === 1) {
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Enter a valid email';
      }
    } else if (step === 2) {
      if (!businessType) {
        setBusinessTypeError('Please select a business type to continue.');
      } else {
        setBusinessTypeError('');
      }
      if (!formData.category) newErrors.category = 'Select a category';
      if (referralOptedOut && !isValidInhouseReferralUrl(inhouseReferralUrl)) {
        setInhouseUrlError('Please enter a valid URL (must start with http:// or https://)');
      } else {
        setInhouseUrlError('');
      }
    }

    setErrors(newErrors);
    const stepHasInlineErrors = step === 2 && (
      !businessType || (referralOptedOut && !isValidInhouseReferralUrl(inhouseReferralUrl))
    );
    return Object.keys(newErrors).length === 0 && !stepHasInlineErrors;
  }, [formData, businessType, referralOptedOut, inhouseReferralUrl]);

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;

    if (currentStep < STEPS.length - 1) {
      animateTransition(() => {
        const next = currentStep + 1;
        setCurrentStep(next);
        animateProgress(next);
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [currentStep, validateStep, animateTransition, animateProgress]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      animateTransition(() => {
        const prev = currentStep - 1;
        setCurrentStep(prev);
        animateProgress(prev);
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (creationMethod !== 'none') {
      Animated.timing(methodFadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setCreationMethod('none');
        Animated.timing(methodFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      router.back();
    }
  }, [currentStep, creationMethod, animateTransition, animateProgress, router, methodFadeAnim]);

  const handleSelectMethod = useCallback((method: CreationMethod) => {
    Animated.timing(methodFadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCreationMethod(method);
      Animated.timing(methodFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [methodFadeAnim]);

  const filteredGoogleProfiles = googleBusinessProfiles.filter(p =>
    p.name.toLowerCase().includes(googleSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(googleSearch.toLowerCase()) ||
    p.address.toLowerCase().includes(googleSearch.toLowerCase())
  );

  const handleSubmit = useCallback(async () => {
    try {
      const profileData: BusinessProfileData = {
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        avatar: formData.avatar,
        businessPhoto: formData.businessPhoto,
        businessLogo: formData.businessLogo,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        address: formData.address,
        category: formData.category,
        hours: formData.hours,
        referralOptIn: formData.referralOptIn ?? true,
      };
      const submitKey = formData.username?.trim() || 'self';
      setBusinessReferralSettings(submitKey, {
        optIn: formData.referralOptIn ?? true,
        website: normaliseWebsiteUrl(formData.website) ?? undefined,
      });
      if (businessType) {
        setBusinessTypeSettings(submitKey, {
          businessType,
          referralOptedOut,
          inhouseReferralUrl: referralOptedOut ? inhouseReferralUrl.trim() : undefined,
        });
      }
      await completeBusinessProfile(profileData);
      console.log('[CreateBusinessProfile] Business profile created, moving to subscription step');
      animateTransition(() => {
        const next = currentStep + 1;
        setCurrentStep(next);
        animateProgress(next);
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      console.log('[CreateBusinessProfile] Error creating profile:', error);
      Alert.alert('Error', 'Failed to create business profile. Please try again.');
    }
  }, [formData, completeBusinessProfile, currentStep, animateTransition, animateProgress, businessType, referralOptedOut, inhouseReferralUrl]);

  const handleSubscriptionComplete = useCallback(() => {
    console.log('[CreateBusinessProfile] Subscription setup complete');
    Alert.alert(
      'Welcome to TouchPoint!',
      `Your business "${formData.name}" is set up with a BizCom subscription. Your 3-month free trial has started.`,
      [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/feed' as any) }]
    );
  }, [formData.name, router]);

  const handleSubscriptionSkip = useCallback(() => {
    console.log('[CreateBusinessProfile] Subscription skipped');
    Alert.alert(
      'Profile Created!',
      `Your business "${formData.name}" has been set up. You can set up your subscription later from settings.`,
      [{ text: 'Continue', onPress: () => router.replace('/(tabs)/feed' as any) }]
    );
  }, [formData.name, router]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <View key={step.title} style={styles.stepDot}>
              <View
                style={[
                  styles.dotCircle,
                  isActive && styles.dotActive,
                  isCompleted && styles.dotCompleted,
                ]}
              >
                {isCompleted ? (
                  <Check size={12} color="#fff" />
                ) : (
                  <StepIcon size={14} color={isActive ? '#fff' : Colors.textTertiary} />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCompleted && styles.stepLabelCompleted,
                ]}
              >
                {step.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderInput = (
    field: keyof LocalBusinessProfileData,
    label: string,
    icon: React.ElementType,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: TextInput['props']['keyboardType'];
      autoCapitalize?: TextInput['props']['autoCapitalize'];
      maxLength?: number;
    }
  ) => {
    const Icon = icon;
    const hasError = !!errors[field];
    return (
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Icon size={16} color={hasError ? Colors.error : Colors.navyLight} />
          <Text style={[styles.inputLabel, hasError && styles.inputLabelError]}>{label}</Text>
        </View>
        <TextInput
          style={[
            styles.textInput,
            options?.multiline && styles.textInputMultiline,
            hasError && styles.textInputError,
          ]}
          value={typeof formData[field] === 'string' ? formData[field] : ''}
          onChangeText={(v) => updateField(field, v)}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          multiline={options?.multiline}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.autoCapitalize ?? 'sentences'}
          maxLength={options?.maxLength}
          textAlignVertical={options?.multiline ? 'top' : 'center'}
        />
        {hasError && <Text style={styles.errorText}>{errors[field]}</Text>}
        {field === 'bio' && (
          <Text style={styles.charCount}>{formData.bio.length}/160</Text>
        )}
      </View>
    );
  };

  const renderStep0 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Building2 size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Let&apos;s set up your business</Text>
        <Text style={styles.stepSubtitle}>Tell us about your business so customers can find you</Text>
      </View>

      <TouchableOpacity style={styles.avatarPicker} activeOpacity={0.7}>
        {formData.avatar ? (
          <Image source={{ uri: formData.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Camera size={28} color={Colors.navyLight} />
            <Text style={styles.avatarText}>Add Logo</Text>
          </View>
        )}
        <View style={styles.avatarBadge}>
          <Camera size={12} color="#fff" />
        </View>
      </TouchableOpacity>

      {renderInput('name', 'Business Name', Store, 'e.g. Rivera Coffee Co.')}
      {renderInput('username', 'Username', Building2, 'e.g. riveracoffee', {
        autoCapitalize: 'none',
      })}
      {renderInput('bio', 'Bio / Tagline', Sparkles, 'Describe your business in a few words...', {
        multiline: true,
        maxLength: 160,
      })}

      <View style={styles.uploadSection}>
        <View style={styles.inputLabelRow}>
          <ImagePlus size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>Business Photo</Text>
        </View>
        <Text style={styles.uploadHint}>Upload a photo that represents your business (e.g. storefront, workspace)</Text>
        {formData.businessPhoto ? (
          <View style={styles.uploadedImageWrap}>
            <Image source={{ uri: formData.businessPhoto }} style={styles.uploadedBusinessPhoto} contentFit="cover" />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => removeImage('businessPhoto')}
              activeOpacity={0.7}
            >
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadPhotoBox}
            onPress={() => pickImage('businessPhoto')}
            activeOpacity={0.7}
          >
            <Camera size={24} color={Colors.navyLight} />
            <Text style={styles.uploadPhotoText}>Tap to upload business photo</Text>
            <Text style={styles.uploadPhotoSubtext}>Recommended: 16:9 landscape</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.uploadSection}>
        <View style={styles.inputLabelRow}>
          <ImagePlus size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>Business Logo</Text>
        </View>
        <Text style={styles.uploadHint}>Upload your business logo for branding across your profile</Text>
        {formData.businessLogo ? (
          <View style={styles.uploadedLogoWrap}>
            <Image source={{ uri: formData.businessLogo }} style={styles.uploadedLogo} contentFit="cover" />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => removeImage('businessLogo')}
              activeOpacity={0.7}
            >
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadLogoBox}
            onPress={() => pickImage('businessLogo')}
            activeOpacity={0.7}
          >
            <Camera size={22} color={Colors.navyLight} />
            <Text style={styles.uploadPhotoText}>Tap to upload logo</Text>
            <Text style={styles.uploadPhotoSubtext}>Recommended: Square (1:1)</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Phone size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Contact Information</Text>
        <Text style={styles.stepSubtitle}>How can customers reach you?</Text>
      </View>

      {renderInput('phone', 'Phone Number', Phone, '+1 (555) 000-0000', {
        keyboardType: 'phone-pad',
      })}
      {renderInput('email', 'Business Email', Mail, 'hello@yourbusiness.com', {
        keyboardType: 'email-address',
        autoCapitalize: 'none',
      })}
      {renderInput('website', 'Website (optional)', Globe, 'www.yourbusiness.com', {
        autoCapitalize: 'none',
        keyboardType: 'url',
      })}
      {renderInput('address', 'Address (optional)', MapPin, '123 Main St, City, State')}
    </Animated.View>
  );

  const renderBusinessTypeSelector = () => {
    const cards: { type: BusinessType; title: string; tagline: string; icon: React.ElementType; emoji: string; bullets: { ok: boolean; text: string }[]; footer: string }[] = [
      {
        type: 'goodwill',
        emoji: '🤝',
        title: 'Goodwill Business',
        tagline: 'Build loyalty through genuine connection.',
        icon: HandHeart,
        bullets: [
          { ok: true, text: 'Post offers & events' },
          { ok: true, text: 'Broadcast to members' },
          { ok: false, text: 'No points system' },
          { ok: false, text: 'No reward tiers' },
          { ok: false, text: 'No rewards catalog' },
        ],
        footer: 'Perfect for businesses that want presence without a gamified loyalty program.',
      },
      {
        type: 'points_based',
        emoji: '🏆',
        title: 'Points & Rewards Business',
        tagline: 'Reward customers with points, tiers, and redeemable rewards.',
        icon: Trophy,
        bullets: [
          { ok: true, text: 'Post offers & events' },
          { ok: true, text: 'Broadcast to members' },
          { ok: true, text: 'Points & reward system' },
          { ok: true, text: 'Reward tiers & catalog' },
          { ok: true, text: 'Redeem rewards in-app' },
        ],
        footer: 'Perfect for businesses that want to drive repeat visits through structured rewards.',
      },
    ];
    return (
      <View style={styles.btSection} testID="business-type-section">
        <Text style={styles.btHeading}>Choose Your Business Type</Text>
        <Text style={styles.btSub}>This determines how you engage your customers on TouchPoint.</Text>
        <View style={styles.btCardsWrap}>
          {cards.map((c) => {
            const selected = businessType === c.type;
            const Icon = c.icon;
            return (
              <TouchableOpacity
                key={c.type}
                style={[styles.btCard, selected && styles.btCardSelected]}
                activeOpacity={0.85}
                onPress={() => {
                  setBusinessTypeState(c.type);
                  setBusinessTypeError('');
                }}
                testID={`business-type-${c.type}`}
              >
                {selected ? (
                  <View style={styles.btCheckBadge}>
                    <Check size={12} color="#fff" />
                  </View>
                ) : null}
                <View style={styles.btCardHeader}>
                  <Text style={styles.btEmoji}>{c.emoji}</Text>
                  <Icon size={18} color={selected ? Colors.navyDark : Colors.navyLight} />
                </View>
                <Text style={styles.btCardTitle}>{c.title}</Text>
                <Text style={styles.btCardTagline}>{c.tagline}</Text>
                <View style={styles.btBulletList}>
                  {c.bullets.map((b) => (
                    <View key={b.text} style={styles.btBulletRow}>
                      <Text style={[styles.btBulletIcon, { color: b.ok ? '#10B981' : '#EF4444' }]}>
                        {b.ok ? '✓' : '✕'}
                      </Text>
                      <Text style={styles.btBulletText}>{b.text}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.btFooter}>{c.footer}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!businessTypeError && (
          <Text style={styles.btError} testID="business-type-error">{businessTypeError}</Text>
        )}
      </View>
    );
  };

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Tag size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Business Details</Text>
        <Text style={styles.stepSubtitle}>Help customers understand what you offer</Text>
      </View>

      {renderBusinessTypeSelector()}

      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Tag size={16} color={errors.category ? Colors.error : Colors.navyLight} />
          <Text style={[styles.inputLabel, errors.category && styles.inputLabelError]}>Category</Text>
        </View>
        <TouchableOpacity
          style={[styles.categorySelector, errors.category && styles.textInputError]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.categorySelectorText,
              !formData.category && styles.categorySelectorPlaceholder,
            ]}
          >
            {formData.category || 'Select a category'}
          </Text>
          <ChevronRight
            size={18}
            color={Colors.textTertiary}
            style={{ transform: [{ rotate: showCategoryPicker ? '90deg' : '0deg' }] }}
          />
        </TouchableOpacity>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
      </View>

      {showCategoryPicker && (
        <View style={styles.categoryList}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryItem,
                  formData.category === cat && styles.categoryItemSelected,
                ]}
                onPress={() => {
                  updateField('category', cat);
                  setShowCategoryPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryItemText,
                    formData.category === cat && styles.categoryItemTextSelected,
                  ]}
                >
                  {cat}
                </Text>
                {formData.category === cat && <Check size={16} color={Colors.navyDark} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {renderInput('hours', 'Business Hours (optional)', Clock, 'e.g. Mon–Fri 9am–5pm')}

      {renderReferralToggle()}
    </Animated.View>
  );

  const renderReferralToggle = () => {
    return (
      <View style={styles.referralSection} testID="referral-program-section">
        <View style={styles.referralHeader}>
          <Gift size={16} color={Colors.navyLight} />
          <Text style={styles.referralTitle}>Referral Program</Text>
        </View>
        <View style={styles.referralRow}>
          <View style={styles.referralRowText}>
            <Text style={styles.referralRowLabel}>Use Your In-House Referral Program</Text>
          </View>
          <Switch
            value={referralOptedOut}
            onValueChange={(v) => {
              setReferralOptedOut(v);
              setFormData((prev) => ({ ...prev, referralOptIn: !v }));
              if (!v) {
                setInhouseReferralUrl('');
                setInhouseUrlError('');
              }
              console.log('[CreateBusinessProfile] referralOptedOut ->', v);
            }}
            trackColor={{ false: '#D6D3E0', true: Colors.navyDark }}
            thumbColor={Platform.OS === 'android' ? (referralOptedOut ? '#fff' : '#f4f3f4') : undefined}
            ios_backgroundColor="#D6D3E0"
            testID="referral-opt-out-switch"
          />
        </View>
        <Text style={styles.referralHelper}>
          {referralOptedOut
            ? 'Your members will be directed to your own in-house referral program instead. TouchPoint referral tracking and point rewards will not apply.'
            : 'By default, your members refer others through the TouchPoint referral program and both parties earn points automatically.'}
        </Text>
        {referralOptedOut ? (
          <View style={styles.inhouseWrap} testID="inhouse-referral-section">
            <View style={styles.inhouseInfoBanner}>
              <Info size={14} color="#B7791F" />
              <Text style={styles.inhouseInfoText}>
                When you opt out, your members will not be able to refer others through the TouchPoint referral program. Instead, referrals will be redirected to your own in-house referral program.
              </Text>
            </View>
            <View style={styles.inputLabelRow}>
              <Link2 size={16} color={inhouseUrlError ? Colors.error : Colors.navyLight} />
              <Text style={[styles.inputLabel, !!inhouseUrlError && styles.inputLabelError]}>Your In-House Referral Program URL</Text>
            </View>
            <TextInput
              style={[styles.textInput, !!inhouseUrlError && styles.textInputError]}
              value={inhouseReferralUrl}
              onChangeText={(v) => {
                setInhouseReferralUrl(v);
                if (inhouseUrlError) setInhouseUrlError('');
              }}
              placeholder="https://yourbusiness.com/refer"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="inhouse-referral-url-input"
            />
            <Text style={styles.inhouseHelper}>
              Members will be redirected to this URL when they attempt to refer someone through TouchPoint.
            </Text>
            {!!inhouseUrlError && <Text style={styles.errorText}>{inhouseUrlError}</Text>}
          </View>
        ) : null}
      </View>
    );
  };

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Sparkles size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Review Your Profile</Text>
        <Text style={styles.stepSubtitle}>Make sure everything looks good</Text>
      </View>

      <View style={styles.reviewCard}>
        <View style={styles.reviewAvatarRow}>
          {formData.avatar ? (
            <Image source={{ uri: formData.avatar }} style={styles.reviewAvatar} />
          ) : (
            <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}>
              <Store size={24} color={Colors.navyLight} />
            </View>
          )}
          <View style={styles.reviewNameBlock}>
            <Text style={styles.reviewName}>{formData.name || 'Business Name'}</Text>
            <Text style={styles.reviewUsername}>@{formData.username || 'username'}</Text>
          </View>
        </View>

        {formData.bio ? (
          <Text style={styles.reviewBio}>{formData.bio}</Text>
        ) : null}

        <View style={styles.reviewDivider} />

        <View style={styles.reviewDetails}>
          {formData.category ? (
            <ReviewRow icon={Tag} label="Category" value={formData.category} />
          ) : null}
          {formData.phone ? (
            <ReviewRow icon={Phone} label="Phone" value={formData.phone} />
          ) : null}
          {formData.email ? (
            <ReviewRow icon={Mail} label="Email" value={formData.email} />
          ) : null}
          {formData.website ? (
            <ReviewRow icon={Globe} label="Website" value={formData.website} />
          ) : null}
          {formData.address ? (
            <ReviewRow icon={MapPin} label="Address" value={formData.address} />
          ) : null}
          {formData.hours ? (
            <ReviewRow icon={Clock} label="Hours" value={formData.hours} />
          ) : null}
          {businessType ? (
            <ReviewRow
              icon={businessType === 'goodwill' ? HandHeart : Trophy}
              label="Business Type"
              value={businessType === 'goodwill' ? 'Goodwill Business' : 'Points & Rewards Business'}
            />
          ) : null}
          <ReviewRow
            icon={Gift}
            label="Referral Program"
            value={referralOptedOut ? `Opted out — redirects to ${inhouseReferralUrl || 'in-house URL'}` : 'Joined — TouchPoint referrals enabled'}
          />
        </View>
      </View>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <BizComSubscription
        onComplete={handleSubscriptionComplete}
        onSkip={handleSubscriptionSkip}
        businessName={formData.name}
      />
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  const renderMethodSelection = () => (
    <Animated.View style={[styles.methodSelectionWrap, { opacity: methodFadeAnim }]}>
      <TouchableOpacity
        style={styles.methodCard}
        activeOpacity={0.7}
        onPress={() => handleSelectMethod('manual')}
      >
        <View style={styles.methodCardIconWrap}>
          <View style={[styles.methodCardIcon, { backgroundColor: Colors.navyDark + '10' }]}> 
            <PenLine size={24} color={Colors.navyDark} />
          </View>
        </View>
        <View style={styles.methodCardContent}>
          <Text style={styles.methodCardTitle}>Create New Profile</Text>
          <Text style={styles.methodCardDesc}>
            Build your business profile from scratch with your own details, logo, and information
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.methodDividerRow}>
        <View style={styles.methodDividerLine} />
        <Text style={styles.methodDividerText}>OR</Text>
        <View style={styles.methodDividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.methodCard, styles.methodCardGoogle]}
        activeOpacity={0.7}
        onPress={() => handleSelectMethod('google')}
      >
        <View style={styles.methodCardIconWrap}>
          <View style={[styles.methodCardIcon, { backgroundColor: '#4285F4' + '12' }]}> 
            <ShieldCheck size={24} color="#4285F4" />
          </View>
        </View>
        <View style={styles.methodCardContent}>
          <Text style={styles.methodCardTitle}>Claim Google Business</Text>
          <Text style={styles.methodCardDesc}>
            Import and verify your existing Google Business Profile to get started faster
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.methodInfoBanner}>
        <Sparkles size={16} color={Colors.navyLight} />
        <Text style={styles.methodInfoText}>
          Claiming your Google profile imports your reviews, photos, and business details automatically
        </Text>
      </View>
    </Animated.View>
  );

  const renderGoogleClaimFlow = () => (
    <View style={styles.googleFlowWrap}>
      <View style={styles.googleSearchHeader}>
        <Text style={styles.googleSearchTitle}>Find Your Business</Text>
        <Text style={styles.googleSearchSubtitle}>
          Search for your business on Google to claim and import your profile
        </Text>
      </View>

      <View style={styles.googleSearchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.googleSearchInput}
          value={googleSearch}
          onChangeText={setGoogleSearch}
          placeholder="Search by name, category, or location..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        style={styles.googleResultsScroll}
        contentContainerStyle={styles.googleResultsContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredGoogleProfiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.googleResultCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/claim-business/${profile.id}` as any)}
          >
            <Image
              source={{ uri: profile.photo }}
              style={styles.googleResultImage}
              contentFit="cover"
            />
            <View style={styles.googleResultInfo}>
              <Text style={styles.googleResultName} numberOfLines={1}>{profile.name}</Text>
              <View style={styles.googleResultRating}>
                <Star size={12} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.googleResultRatingText}>{profile.rating}</Text>
                <Text style={styles.googleResultReviews}>({profile.reviewCount.toLocaleString()})</Text>
              </View>
              <View style={styles.googleResultDetail}>
                <MapPin size={11} color={Colors.textTertiary} />
                <Text style={styles.googleResultDetailText} numberOfLines={1}>{profile.address}</Text>
              </View>
              <Text style={styles.googleResultCategory}>{profile.category}</Text>
            </View>
            <View style={styles.googleClaimBadge}>
              <Text style={styles.googleClaimBadgeText}>Claim</Text>
            </View>
          </TouchableOpacity>
        ))}

        {filteredGoogleProfiles.length === 0 && (
          <View style={styles.googleNoResults}>
            <Search size={32} color={Colors.textTertiary} />
            <Text style={styles.googleNoResultsText}>No businesses found</Text>
            <Text style={styles.googleNoResultsSubtext}>Try a different search term</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  if (creationMethod === 'none') {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color={Colors.bannerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Business Profile</Text>
            <View style={styles.headerBtn} />
          </View>
        </SafeAreaView>
        <ScrollView
          ref={methodScrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ───── Hero Banner ───── */}
          <LinearGradient
            colors={['#0F1A2E', '#152238', '#1A2F4A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>FOR BUSINESSES</Text>
              <Text style={styles.heroHeadline}>Grow Your Business with Real Connections</Text>
              <Text style={styles.heroSubtext}>
                Join TouchPoint and turn every customer into a loyal advocate — no noise, no spam, just results.
              </Text>
              <TouchableOpacity
                style={styles.heroCta}
                activeOpacity={0.85}
                onPress={() => handleSelectMethod('manual')}
              >
                <Text style={styles.heroCtaText}>Get Started</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ───── Why Businesses Love TouchPoint Slider ───── */}
          <View style={styles.featuresSliderWrap}>
            <Text style={styles.featuresSliderHeading}>Why Businesses Love TouchPoint</Text>

            <FlatList
              data={FEATURE_SLIDES}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDE_CARD_WIDTH + SLIDE_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.sliderListContent}
              onViewableItemsChanged={onSlideViewableChanged}
              viewabilityConfig={slideViewabilityConfig}
              renderItem={({ item }) => (
                <View style={styles.slideCardOuter}>
                  <View style={styles.slideCard}>
                    <View style={styles.slideIconCircle}>
                      <item.icon size={36} color="#2E7D32" />
                    </View>
                    <Text style={styles.slideTitle}>{item.title}</Text>
                    <Text style={styles.slideDesc}>{item.desc}</Text>
                  </View>
                </View>
              )}
            />

            <View style={styles.sliderDotsRow}>
              {FEATURE_SLIDES.map((_, i) => {
                const isActive = i === activeSlideIndex;
                return (
                  <View
                    key={`sdot-${i}`}
                    style={[
                      styles.sliderDot,
                      isActive ? styles.sliderDotActive : styles.sliderDotInactive,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (creationMethod === 'google') {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.headerBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color={Colors.bannerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Claim Google Business</Text>
            <View style={styles.headerBtn} />
          </View>
        </SafeAreaView>
        {renderGoogleClaimFlow()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.headerBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Business Profile</Text>
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ───── Existing Form ───── */}
          {renderStepIndicator()}
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {currentStep < 4 && (
        <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
          <View style={styles.footer}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, currentStep === 0 && { flex: 1 }]}
              onPress={currentStep === 3 ? handleSubmit : goNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === 3 ? 'Create Profile' : 'Continue'}
              </Text>
              {currentStep < 3 && <ChevronRight size={18} color="#fff" />}
              {currentStep === 3 && <Check size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

function ReviewRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewRowIcon}>
        <Icon size={15} color={Colors.navyLight} />
      </View>
      <View style={styles.reviewRowContent}>
        <Text style={styles.reviewRowLabel}>{label}</Text>
        <Text style={styles.reviewRowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  methodSelectionWrap: {
    paddingTop: 8,
  },
  methodHeader: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 6,
  },
  methodTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginTop: 12,
  },
  methodSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    maxWidth: 280,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 14,
  },
  methodCardGoogle: {
    borderColor: '#4285F4' + '30',
  },
  methodCardIconWrap: {},
  methodCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCardContent: {
    flex: 1,
  },
  methodCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  methodCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  methodDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  methodDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  methodDividerText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  methodInfoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.navyDark + '06',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.navyDark + '10',
  },
  methodInfoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  googleFlowWrap: {
    flex: 1,
    padding: 16,
  },
  googleSearchHeader: {
    marginBottom: 16,
  },
  googleSearchTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  googleSearchSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  googleSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    gap: 10,
  },
  googleSearchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: Colors.text,
  },
  googleResultsScroll: {
    flex: 1,
  },
  googleResultsContent: {
    paddingBottom: 40,
  },
  googleResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
    gap: 12,
  },
  googleResultImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  googleResultInfo: {
    flex: 1,
  },
  googleResultName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  googleResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  googleResultRatingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  googleResultReviews: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  googleResultDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  googleResultDetailText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  googleResultCategory: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#4285F4',
  },
  googleClaimBadge: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  googleClaimBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  googleNoResults: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  googleNoResultsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  googleNoResultsSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  flex: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: Colors.banner,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.banner,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  stepIndicator: {
    backgroundColor: Colors.surface,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.navyDark,
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepDot: {
    alignItems: 'center',
    gap: 6,
  },
  dotCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: Colors.navyDark,
  },
  dotCompleted: {
    backgroundColor: Colors.teal,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.1,
  },
  stepLabelActive: {
    color: Colors.navyDark,
    fontWeight: '600' as const,
  },
  stepLabelCompleted: {
    color: Colors.teal,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {},
  stepHeader: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 6,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginTop: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.1,
  },
  inputLabelError: {
    color: Colors.error,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '400' as const,
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: 13,
  },
  textInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'right' as const,
    marginTop: 4,
  },
  categorySelector: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categorySelectorText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '400' as const,
  },
  categorySelectorPlaceholder: {
    color: Colors.textTertiary,
  },
  categoryList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 18,
    maxHeight: 360,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    minHeight: 50,
  },
  categoryItemSelected: {
    backgroundColor: Colors.navyDark + '08',
  },
  categoryItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '400' as const,
  },
  categoryItemTextSelected: {
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  reviewAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reviewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  reviewAvatarPlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNameBlock: {
    flex: 1,
  },
  reviewName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  reviewUsername: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  reviewBio: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  reviewDetails: {
    gap: 12,
  },
  uploadSection: {
    marginBottom: 18,
  },
  uploadHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 10,
    lineHeight: 17,
  },
  uploadPhotoBox: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadLogoBox: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 14,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadPhotoText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.navyLight,
  },
  uploadPhotoSubtext: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  uploadedImageWrap: {
    position: 'relative',
  },
  uploadedBusinessPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  uploadedLogoWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  uploadedLogo: {
    width: 120,
    height: 120,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reviewRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reviewRowContent: {
    flex: 1,
  },
  reviewRowLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  referralSection: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  referralTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  referralRowText: { flex: 1 },
  referralRowLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  referralHelper: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    lineHeight: 17,
  },
  referralWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#FFF8E5',
    borderWidth: 1,
    borderColor: '#F5D58A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  referralWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#7A5418',
    lineHeight: 17,
  },
  btSection: {
    marginBottom: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  btHeading: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  btSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  btCardsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  btCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 240,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    padding: 14,
    position: 'relative' as const,
  },
  btCardSelected: {
    borderColor: Colors.navyDark,
    borderWidth: 2,
    backgroundColor: Colors.navyDark + '08',
  },
  btCheckBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 28,
  },
  btEmoji: {
    fontSize: 26,
  },
  btCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  btCardTagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 17,
  },
  btBulletList: {
    gap: 5,
    marginBottom: 10,
  },
  btBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btBulletIcon: {
    fontSize: 13,
    fontWeight: '700' as const,
    width: 14,
  },
  btBulletText: {
    flex: 1,
    fontSize: 12.5,
    color: Colors.text,
  },
  btFooter: {
    fontSize: 11.5,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
    lineHeight: 16,
  },
  btError: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  inhouseWrap: {
    marginTop: 14,
    gap: 6,
  },
  inhouseInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8E5',
    borderWidth: 1,
    borderColor: '#F5D58A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  inhouseInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#7A5418',
    lineHeight: 17,
  },
  inhouseHelper: {
    fontSize: 11.5,
    color: Colors.textTertiary,
    lineHeight: 16,
    marginTop: 4,
  },
  reviewRowValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  footerSafe: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    flex: 0.4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  nextBtn: {
    flex: 0.6,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },

  // ─── Hero Banner ───
  heroBanner: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
  },
  heroContent: {
    alignItems: 'center',
    gap: 12,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center' as const,
    lineHeight: 21,
    maxWidth: 320,
  },
  heroCta: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 12,
    gap: 6,
    alignSelf: 'stretch' as const,
  },
  heroCtaText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },

  // ─── Why Businesses Love TouchPoint ───
  featuresSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 12,
  },
  featuresHeading: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  featureCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // ─── Divider + Form Heading ───
  formSectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  formSectionDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: 24,
    marginTop: 8,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  formSectionSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 18,
    marginBottom: 24,
  },

  // ─── Features Slider ───
  featuresSliderWrap: {
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
    paddingBottom: 20,
  },
  featuresSliderHeading: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sliderListContent: {
    paddingHorizontal: 16,
    gap: SLIDE_GAP,
  },
  slideCardOuter: {
    width: SLIDE_CARD_WIDTH,
  },
  slideCard: {
    width: SLIDE_CARD_WIDTH,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  slideIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  slideTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
    textAlign: 'center' as const,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  slideDesc: {
    fontSize: 13,
    color: '#388E3C',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  sliderDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
  },
  sliderDot: {
    height: 6,
    borderRadius: 3,
  },
  sliderDotActive: {
    width: 16,
    backgroundColor: '#2E7D32',
  },
  sliderDotInactive: {
    width: 6,
    backgroundColor: '#A5D6A7',
  },
});

