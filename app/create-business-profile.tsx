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
  Switch,
  ActivityIndicator,
  type ViewToken,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Building2,
  Phone,
  Globe,
  MapPin,
  Clock,
  Tag,
  ChevronRight,
  Check,
  Sparkles,
  Store,
  FileText,
  ShieldCheck,
  PenLine,
  ImagePlus,
  X,
  MessagesSquare,
  Ban,
  Share2,
  Gift,
  HandHeart,
  Trophy,
  Info,
  Link2,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useCreateBusiness, type BusinessType } from '@/hooks/useCreateBusiness';

const STEPS = [
  { title: 'Basics', icon: Store },
  { title: 'Contact', icon: Phone },
  { title: 'Hours', icon: Clock },
  { title: 'Referral', icon: Gift },
  { title: 'Media', icon: ImagePlus },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

type CreationMethod = 'none' | 'manual';

export default function CreateBusinessProfileScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const methodScrollRef = useRef<ScrollView>(null);
  const [creationMethod, setCreationMethod] = useState<CreationMethod>('none');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const methodFadeAnim = useRef(new Animated.Value(1)).current;

  const {
    currentStep,
    errors,
    loading,
    apiError,
    setApiError,
    // Step 1
    businessName, setBusinessName,
    businessType, setBusinessType,
    categoryId, setCategoryId,
    description, setDescription,
    businessCategories,
    // Step 2
    phone, setPhone,
    website, setWebsite,
    address, setAddress,
    country, onCountryChange, onCountrySelect, countrySuggestions,
    state,   onStateChange,   onStateSelect,   stateSuggestions,
    city,    onCityChange,    onCitySelect,    citySuggestions,
    // Step 3
    hours, updateHour,
    // Step 4
    inhouseReferral, setInhouseReferral,
    inhouseReferralUrl, setInhouseReferralUrl,
    // Step 5
    logoUri, coverUri,
    pickLogo, pickCover,
    // Navigation
    goNext: hookGoNext,
    goBack: hookGoBack,
    submit,
  } = useCreateBusiness();

  const onSlideViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) return;
    const first = viewableItems[0];
    if (typeof first.index === 'number') setActiveSlideIndex(first.index);
  }).current;

  const slideViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const animateProgress = useCallback((stepIndex: number) => {
    Animated.spring(progressAnim, {
      toValue: stepIndex / (STEPS.length - 1),
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

  const goNext = useCallback(() => {
    animateTransition(() => {
      hookGoNext();
      animateProgress(currentStep); // currentStep is old value; after hookGoNext it'll be +1
    });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [animateTransition, hookGoNext, animateProgress, currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      animateTransition(() => {
        hookGoBack();
        animateProgress(currentStep - 2);
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
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
    }
  }, [currentStep, animateTransition, hookGoBack, animateProgress, methodFadeAnim]);

  const handleSelectManual = useCallback(() => {
    Animated.timing(methodFadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCreationMethod('manual');
      Animated.timing(methodFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [methodFadeAnim]);

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
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <View key={step.title} style={styles.stepDot}>
              <View style={[styles.dotCircle, isActive && styles.dotActive, isCompleted && styles.dotCompleted]}>
                {isCompleted ? (
                  <Check size={12} color="#fff" />
                ) : (
                  <StepIcon size={14} color={isActive ? '#fff' : Colors.textTertiary} />
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isCompleted && styles.stepLabelCompleted]}>
                {step.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderBusinessTypeSelector = () => {
    const cards: { type: 'goodwill' | 'incentivised'; title: string; tagline: string; icon: React.ElementType; emoji: string; bullets: { ok: boolean; text: string }[]; footer: string }[] = [
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
        type: 'incentivised',
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
      <View style={styles.btSection}>
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
                onPress={() => setBusinessType(c.type as BusinessType)}
              >
                {selected && (
                  <View style={styles.btCheckBadge}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
                <View style={styles.btCardHeader}>
                  <Text style={styles.btEmoji}>{c.emoji}</Text>
                  <Icon size={18} color={selected ? Colors.navyDark : Colors.navyLight} />
                </View>
                <Text style={styles.btCardTitle}>{c.title}</Text>
                <Text style={styles.btCardTagline}>{c.tagline}</Text>
                <View style={styles.btBulletList}>
                  {c.bullets.map((b) => (
                    <View key={b.text} style={styles.btBulletRow}>
                      <Text style={[styles.btBulletIcon, { color: b.ok ? '#10B981' : '#EF4444' }]}>{b.ok ? '✓' : '✕'}</Text>
                      <Text style={styles.btBulletText}>{b.text}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.btFooter}>{c.footer}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!errors.businessType && <Text style={styles.btError}>{errors.businessType}</Text>}
      </View>
    );
  };

  const renderStep1 = () => {
    const selectedCategory = businessCategories.find(c => c.id === categoryId);
    return (
      <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
        <View style={styles.stepHeader}>
          <Building2 size={28} color={Colors.navyDark} />
          <Text style={styles.stepTitle}>Business Basics</Text>
          <Text style={styles.stepSubtitle}>Tell us the essentials about your business</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <Store size={16} color={errors.businessName ? Colors.error : Colors.navyLight} />
            <Text style={[styles.inputLabel, !!errors.businessName && styles.inputLabelError]}>Business Name *</Text>
          </View>
          <TextInput
            style={[styles.textInput, !!errors.businessName && styles.textInputError]}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Rivera Coffee Co."
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
          />
          {!!errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
        </View>

        {renderBusinessTypeSelector()}

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <Tag size={16} color={errors.categoryId ? Colors.error : Colors.navyLight} />
            <Text style={[styles.inputLabel, !!errors.categoryId && styles.inputLabelError]}>Category *</Text>
          </View>
          <TouchableOpacity
            style={[styles.categorySelector, !!errors.categoryId && styles.textInputError]}
            onPress={() => setShowCategoryPicker(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categorySelectorText, !selectedCategory && styles.categorySelectorPlaceholder]}>
              {selectedCategory ? selectedCategory.name : 'Select a category'}
            </Text>
            <ChevronRight size={18} color={Colors.textTertiary} style={{ transform: [{ rotate: showCategoryPicker ? '90deg' : '0deg' }] }} />
          </TouchableOpacity>
          {!!errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
        </View>

        {showCategoryPicker && (
          <View style={styles.categoryList}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {businessCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryItem, categoryId === cat.id && styles.categoryItemSelected]}
                  onPress={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryItemText, categoryId === cat.id && styles.categoryItemTextSelected]}>{cat.name}</Text>
                  {categoryId === cat.id && <Check size={16} color={Colors.navyDark} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <FileText size={16} color={Colors.navyLight} />
            <Text style={styles.inputLabel}>Description (optional)</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly describe what your business offers..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </View>
      </Animated.View>
    );
  };

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Phone size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Contact & Location</Text>
        <Text style={styles.stepSubtitle}>How can customers find and reach you?</Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Phone size={16} color={errors.phone ? Colors.error : Colors.navyLight} />
          <Text style={[styles.inputLabel, !!errors.phone && styles.inputLabelError]}>Phone (optional)</Text>
        </View>
        <TextInput
          style={[styles.textInput, !!errors.phone && styles.textInputError]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="phone-pad"
        />
        {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Globe size={16} color={errors.website ? Colors.error : Colors.navyLight} />
          <Text style={[styles.inputLabel, !!errors.website && styles.inputLabelError]}>Website (optional)</Text>
        </View>
        <TextInput
          style={[styles.textInput, !!errors.website && styles.textInputError]}
          value={website}
          onChangeText={setWebsite}
          placeholder="https://yourbusiness.com"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          keyboardType="url"
        />
        {!!errors.website && <Text style={styles.errorText}>{errors.website}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <MapPin size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>Address (optional)</Text>
        </View>
        <TextInput
          style={styles.textInput}
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St"
          placeholderTextColor={Colors.textTertiary}
        />
      </View>

      <View style={[styles.inputGroup, { zIndex: 30 }]}>
        <View style={styles.inputLabelRow}>
          <MapPin size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>Country (optional)</Text>
        </View>
        <TextInput
          style={styles.textInput}
          value={country}
          onChangeText={onCountryChange}
          placeholder="Start typing country..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="words"
        />
        {countrySuggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {countrySuggestions.map(c => (
              <TouchableOpacity key={c.isoCode} style={styles.suggestionItem} onPress={() => onCountrySelect(c)}>
                <Text style={styles.suggestionText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.inputGroup, { zIndex: 20 }]}>
        <View style={styles.inputLabelRow}>
          <MapPin size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>State (optional)</Text>
        </View>
        <TextInput
          style={styles.textInput}
          value={state}
          onChangeText={onStateChange}
          placeholder="Start typing state..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="words"
        />
        {stateSuggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {stateSuggestions.map(s => (
              <TouchableOpacity key={s.isoCode} style={styles.suggestionItem} onPress={() => onStateSelect(s)}>
                <Text style={styles.suggestionText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.inputGroup, { zIndex: 10 }]}>
        <View style={styles.inputLabelRow}>
          <MapPin size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>City (optional)</Text>
        </View>
        <TextInput
          style={styles.textInput}
          value={city}
          onChangeText={onCityChange}
          placeholder="Start typing city..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="words"
        />
        {citySuggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {citySuggestions.map(c => (
              <TouchableOpacity key={c.name} style={styles.suggestionItem} onPress={() => onCitySelect(c)}>
                <Text style={styles.suggestionText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Clock size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Business Hours</Text>
        <Text style={styles.stepSubtitle}>Set your opening hours for each day (optional)</Text>
      </View>

      {hours.map((h, index) => (
        <View key={h.day_of_week} style={styles.hoursRow}>
          <Text style={styles.hoursDay}>{DAYS[h.day_of_week]}</Text>
          <Switch
            value={!h.is_closed}
            onValueChange={(v) => updateHour(index, { is_closed: !v })}
            trackColor={{ false: '#D6D3E0', true: Colors.navyDark }}
            thumbColor={Platform.OS === 'android' ? (!h.is_closed ? '#fff' : '#f4f3f4') : undefined}
            ios_backgroundColor="#D6D3E0"
          />
          {!h.is_closed ? (
            <View style={styles.hoursTimeRow}>
              <TextInput
                style={styles.hoursTimeInput}
                value={h.open_time ?? ''}
                onChangeText={(v) => updateHour(index, { open_time: v })}
                placeholder="09:00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <Text style={styles.hoursTimeSep}>–</Text>
              <TextInput
                style={styles.hoursTimeInput}
                value={h.close_time ?? ''}
                onChangeText={(v) => updateHour(index, { close_time: v })}
                placeholder="18:00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          ) : (
            <Text style={styles.hoursClosed}>Closed</Text>
          )}
        </View>
      ))}
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <Gift size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Referral Settings</Text>
        <Text style={styles.stepSubtitle}>Choose how your customers refer others</Text>
      </View>

      <View style={styles.referralSection}>
        <View style={styles.referralHeader}>
          <Gift size={16} color={Colors.navyLight} />
          <Text style={styles.referralTitle}>Referral Program</Text>
        </View>
        <View style={styles.referralRow}>
          <View style={styles.referralRowText}>
            <Text style={styles.referralRowLabel}>Use Your In-House Referral Program</Text>
          </View>
          <Switch
            value={inhouseReferral}
            onValueChange={(v) => {
              setInhouseReferral(v);
              if (!v) setInhouseReferralUrl('');
            }}
            trackColor={{ false: '#D6D3E0', true: Colors.navyDark }}
            thumbColor={Platform.OS === 'android' ? (inhouseReferral ? '#fff' : '#f4f3f4') : undefined}
            ios_backgroundColor="#D6D3E0"
          />
        </View>
        <Text style={styles.referralHelper}>
          {inhouseReferral
            ? 'Your members will be directed to your own in-house referral program. TouchPoint referral tracking and point rewards will not apply.'
            : 'By default, your members refer others through the TouchPoint referral program and both parties earn points automatically.'}
        </Text>

        {inhouseReferral && (
          <View style={styles.inhouseWrap}>
            <View style={styles.inhouseInfoBanner}>
              <Info size={14} color="#B7791F" />
              <Text style={styles.inhouseInfoText}>
                When you opt in, referrals will be redirected to your own in-house referral program instead of TouchPoint.
              </Text>
            </View>
            <View style={styles.inputLabelRow}>
              <Link2 size={16} color={errors.inhouseReferralUrl ? Colors.error : Colors.navyLight} />
              <Text style={[styles.inputLabel, !!errors.inhouseReferralUrl && styles.inputLabelError]}>Your In-House Referral URL *</Text>
            </View>
            <TextInput
              style={[styles.textInput, !!errors.inhouseReferralUrl && styles.textInputError]}
              value={inhouseReferralUrl}
              onChangeText={setInhouseReferralUrl}
              placeholder="https://yourbusiness.com/refer"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {!!errors.inhouseReferralUrl && <Text style={styles.errorText}>{errors.inhouseReferralUrl}</Text>}
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderStep5 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <ImagePlus size={28} color={Colors.navyDark} />
        <Text style={styles.stepTitle}>Business Media</Text>
        <Text style={styles.stepSubtitle}>Add your logo and a cover photo (optional)</Text>
      </View>

      <View style={styles.uploadSection}>
        <View style={styles.inputLabelRow}>
          <ImagePlus size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>Business Logo</Text>
        </View>
        <Text style={styles.uploadHint}>Upload your business logo — square format recommended</Text>
        {logoUri ? (
          <View style={styles.uploadedLogoWrap}>
            <Image source={{ uri: logoUri }} style={styles.uploadedLogo} contentFit="cover" />
            <TouchableOpacity style={styles.removeImageBtn} onPress={pickLogo} activeOpacity={0.7}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadLogoBox} onPress={pickLogo} activeOpacity={0.7}>
            <Camera size={22} color={Colors.navyLight} />
            <Text style={styles.uploadPhotoText}>Tap to upload logo</Text>
            <Text style={styles.uploadPhotoSubtext}>Recommended: 1:1 square</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.uploadSection}>
        <View style={styles.inputLabelRow}>
          <ImagePlus size={16} color={Colors.navyLight} />
          <Text style={styles.inputLabel}>Cover Photo</Text>
        </View>
        <Text style={styles.uploadHint}>Upload a photo that represents your business (e.g. storefront, workspace)</Text>
        {coverUri ? (
          <View style={styles.uploadedImageWrap}>
            <Image source={{ uri: coverUri }} style={styles.uploadedBusinessPhoto} contentFit="cover" />
            <TouchableOpacity style={styles.removeImageBtn} onPress={pickCover} activeOpacity={0.7}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadPhotoBox} onPress={pickCover} activeOpacity={0.7}>
            <Camera size={24} color={Colors.navyLight} />
            <Text style={styles.uploadPhotoText}>Tap to upload cover photo</Text>
            <Text style={styles.uploadPhotoSubtext}>Recommended: 16:9 landscape</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!apiError && (
        <View style={styles.apiErrorBanner}>
          <Text style={styles.apiErrorText}>{apiError}</Text>
          <TouchableOpacity onPress={() => setApiError(null)}>
            <X size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

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
              <TouchableOpacity style={styles.heroCta} activeOpacity={0.85} onPress={handleSelectManual}>
                <Text style={styles.heroCtaText}>Get Started</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

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
              {FEATURE_SLIDES.map((_, i) => (
                <View
                  key={`sdot-${i}`}
                  style={[styles.sliderDot, i === activeSlideIndex ? styles.sliderDotActive : styles.sliderDotInactive]}
                />
              ))}
            </View>
          </View>

          <Animated.View style={[styles.methodSelectionWrap, { opacity: methodFadeAnim }]}>
            <TouchableOpacity style={styles.methodCard} activeOpacity={0.7} onPress={handleSelectManual}>
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

            <View style={styles.methodInfoBanner}>
              <Sparkles size={16} color={Colors.navyLight} />
              <Text style={styles.methodInfoText}>
                Complete your profile in 5 quick steps — business details, contact info, hours, referral settings, and media.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
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

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepIndicator()}
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, currentStep === 1 && { flex: 1 }, loading && { opacity: 0.7 }]}
            onPress={currentStep === 5 ? submit : goNext}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>{currentStep === 5 ? 'Create Business' : 'Continue'}</Text>
                {currentStep < 5 && <ChevronRight size={18} color="#fff" />}
                {currentStep === 5 && <Check size={18} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  hoursDay: {
    width: 34,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  hoursTimeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hoursTimeInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  hoursTimeSep: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  hoursClosed: {
    flex: 1,
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
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
    marginTop: 8,
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
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    gap: 10,
  },
  apiErrorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    lineHeight: 18,
  },

  // ─── Location Autocomplete ───
  suggestionList: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    zIndex: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
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
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#fff',
    textAlign: 'center' as const,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center' as const,
    lineHeight: 21,
    maxWidth: 300,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },

  // ─── Feature Slides ───
  featuresSliderWrap: {
    marginTop: 28,
    marginBottom: 12,
  },
  featuresSliderHeading: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  sliderListContent: {
    paddingRight: 20,
    gap: SLIDE_GAP,
  },
  slideCardOuter: {
    width: SLIDE_CARD_WIDTH,
  },
  slideCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    gap: 10,
  },
  slideIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  slideTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.2,
  },
  slideDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 19,
  },
  sliderDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  sliderDot: {
    height: 6,
    borderRadius: 3,
  },
  sliderDotActive: {
    width: 18,
    backgroundColor: Colors.navyDark,
  },
  sliderDotInactive: {
    width: 6,
    backgroundColor: Colors.borderLight,
  },
});
