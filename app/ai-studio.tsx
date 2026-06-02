import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Button, Switch, Chip, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Tag,
  Calendar,
  Megaphone,
  Coffee,
  ShoppingBag,
  Heart,
  Dumbbell,
  Scissors,
  Briefcase,
  Wrench,
  GraduationCap,
  Copy,
  RefreshCw,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
} from 'lucide-react-native';
import { AI_IMAGE_STYLES, type AIImageStyle } from '@/constants/imageStyles';
import { useAIStudio, type AIContentType } from '@/hooks/useAIStudio';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/contexts/PostsContext';

const PURPLE_DEEP = '#00B246';
const ORANGE = '#1A5C35';
const BG = '#F6F5FA';
const SURFACE = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E5E7EB';

const CONTENT_TYPES: { id: AIContentType; label: string; icon: typeof Tag }[] = [
  { id: 'offer', label: 'Offer', icon: Tag },
  { id: 'event', label: 'Event', icon: Calendar },
  { id: 'post', label: 'Post', icon: Megaphone },
];

const CATEGORIES: { id: string; label: string; icon: typeof Coffee }[] = [
  { id: 'cafe', label: 'Cafe', icon: Coffee },
  { id: 'retail', label: 'Retail', icon: ShoppingBag },
  { id: 'wellness', label: 'Wellness', icon: Heart },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'beauty', label: 'Beauty', icon: Scissors },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'trades', label: 'Trades', icon: Wrench },
  { id: 'education', label: 'Education', icon: GraduationCap },
];

const PLACEHOLDERS: Record<AIContentType, string> = {
  offer: 'e.g. 20% off all shoes this weekend, for loyalty members only…',
  event: 'e.g. Live music night on Friday 9pm, free entry before 8pm…',
  post: 'e.g. We just got new summer stock, come check it out…',
};

type Audience = 'all' | 'loyalty' | 'new';

export default function AIStudioScreen() {
  const router = useRouter();
  const { hasBusinessProfile, businessProfileData } = useAuth();
  const { addPost } = usePosts();

  const businessName = businessProfileData?.name || 'The Brew House';

  const [contentType, setContentType] = useState<AIContentType>('offer');
  const [categoryId, setCategoryId] = useState<string>('cafe');
  const [draftText, setDraftText] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<AIImageStyle>(AI_IMAGE_STYLES[0]);
  const [scheduleLater, setScheduleLater] = useState<boolean>(false);
  const [audience, setAudience] = useState<Audience>('all');
  const [rewardPoints, setRewardPoints] = useState<boolean>(false);
  const [pointsValue, setPointsValue] = useState<string>('10');
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<string>('');
  const [successOpen, setSuccessOpen] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);
  const styleSectionY = useRef<number>(0);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const ai = useAIStudio(businessName);

  const showResults = ai.generatedText !== null && ai.imageUrl !== null;

  useEffect(() => {
    if (showResults) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [showResults, slideAnim, fadeAnim]);

  const handleGenerate = useCallback(() => {
    setImageError(false);
    setImageLoading(true);
    void ai.generate(draftText, contentType, selectedStyle);
  }, [ai, draftText, contentType, selectedStyle]);

  const handleRegenerateText = useCallback(() => {
    void ai.regenerateText(draftText, contentType);
  }, [ai, draftText, contentType]);

  const handleRegenerateImage = useCallback(() => {
    setImageError(false);
    setImageLoading(true);
    ai.regenerateImage(draftText, selectedStyle);
  }, [ai, draftText, selectedStyle]);

  const handleCopy = useCallback(async () => {
    if (!ai.generatedText) return;
    const text = `${ai.generatedText.title}\n\n${ai.generatedText.body}`;
    await Clipboard.setStringAsync(text);
    setSnackbar('Copied to clipboard ✓');
  }, [ai.generatedText]);

  const handleSaveDraft = useCallback(() => {
    if (!ai.generatedText || !ai.imageUrl) return;
    ai.saveToHistory({
      type: contentType,
      title: ai.generatedText.title,
      body: ai.generatedText.body,
      imageUrl: ai.imageUrl,
      styleId: selectedStyle.id,
      status: 'draft',
    });
    setSnackbar('Saved to drafts ✓');
  }, [ai, contentType, selectedStyle.id]);

  const handlePublish = useCallback(() => {
    if (!ai.generatedText || !ai.imageUrl) return;
    ai.saveToHistory({
      type: contentType,
      title: ai.generatedText.title,
      body: ai.generatedText.body,
      imageUrl: ai.imageUrl,
      styleId: selectedStyle.id,
      status: 'published',
    });
    addPost({
      text: `${ai.generatedText.title}\n\n${ai.generatedText.body}`,
      image_url: ai.imageUrl,
      business_name: businessName,
    });
    setSuccessOpen(true);
  }, [ai, contentType, selectedStyle.id, addPost, businessName]);

  const handleCreateAnother = useCallback(() => {
    ai.reset();
    setDraftText('');
    setSuccessOpen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [ai]);

  const handleViewInFeed = useCallback(() => {
    setSuccessOpen(false);
    router.replace('/(tabs)' as never);
  }, [router]);

  const scrollToStyles = useCallback(() => {
    scrollRef.current?.scrollTo({ y: styleSectionY.current - 16, animated: true });
  }, []);

  const charCount = draftText.length;
  const canGenerate = draftText.trim().length > 0 && !ai.isGenerating;

  // Empty state — no business profile
  if (!hasBusinessProfile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="ai-back">
            <ArrowLeft size={22} color={TEXT} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={18} color={PURPLE_DEEP} />
              <Text style={styles.headerTitle}>AI Studio</Text>
            </View>
          </View>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.emptyWrap}>
          <Surface style={styles.emptyCard} elevation={2}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={28} color={PURPLE_DEEP} />
            </View>
            <Text style={styles.emptyTitle}>You need a Business Profile</Text>
            <Text style={styles.emptyBody}>
              AI Studio creates polished offers, events and posts for your business. Set up your
              Business Profile to get started.
            </Text>
            <Button
              mode="contained"
              buttonColor={PURPLE_DEEP}
              textColor="#fff"
              style={styles.emptyBtn}
              onPress={() => router.push('/create-business-profile' as never)}
            >
              Create Business Profile
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="ai-back">
          <ArrowLeft size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerTitleRow}>
            <Sparkles size={18} color={PURPLE_DEEP} />
            <Text style={styles.headerTitle}>AI Studio</Text>
            <View style={styles.betaChip}>
              <Text style={styles.betaChipText}>Beta</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {businessName} · Create polished content in seconds
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/ai-studio-history' as never)}
          style={styles.backBtn}
          testID="ai-history"
        >
          <Clock size={22} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1 — Content Type */}
        <StepLabel index={1} title="What are you creating?" />
        <View style={styles.segment}>
          {CONTENT_TYPES.map((t) => {
            const active = contentType === t.id;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setContentType(t.id)}
                testID={`ai-type-${t.id}`}
              >
                <Icon size={16} color={active ? '#fff' : TEXT} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* STEP 2 — Business Category */}
        <StepLabel index={2} title="Business category" />
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryRow}
          renderItem={({ item }) => {
            const active = categoryId === item.id;
            const Icon = item.icon;
            return (
              <TouchableOpacity
                style={[styles.categoryItem, active && styles.categoryItemActive]}
                onPress={() => setCategoryId(item.id)}
                testID={`ai-cat-${item.id}`}
              >
                <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                  <Icon size={20} color={active ? '#fff' : PURPLE_DEEP} />
                </View>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* STEP 3a — Draft Input */}
        <StepLabel index={3} title="Your rough idea" />
        <Surface style={styles.inputCard} elevation={1}>
          <RNTextInput
            value={draftText}
            onChangeText={setDraftText}
            placeholder={PLACEHOLDERS[contentType]}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={600}
            style={styles.textArea}
            testID="ai-draft-input"
          />
          <Text style={styles.charCount}>{charCount} / 600</Text>
        </Surface>

        {/* STEP 3b — Image Style */}
        <View
          onLayout={(e) => {
            styleSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <StepLabel index={4} title="Image style" />
        </View>
        <FlatList
          data={AI_IMAGE_STYLES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.styleRow}
          renderItem={({ item }) => {
            const active = selectedStyle.id === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedStyle(item)}
                style={[styles.styleCard, active && styles.styleCardActive]}
                testID={`ai-style-${item.id}`}
              >
                <LinearGradient
                  colors={item.gradient as unknown as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.styleSwatch}
                >
                  {active && (
                    <View style={styles.styleCheck}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
                <Text style={[styles.styleName, active && styles.styleNameActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* STEP 4 — Generate Button */}
        <Button
          mode="contained"
          buttonColor={PURPLE_DEEP}
          textColor="#fff"
          style={styles.generateBtn}
          contentStyle={styles.generateBtnContent}
          disabled={!canGenerate}
          loading={ai.isGenerating}
          icon={() => <Sparkles size={18} color="#fff" />}
          onPress={handleGenerate}
          testID="ai-generate-btn"
        >
          {ai.isGenerating ? 'AI is crafting your content…' : 'Generate Content'}
        </Button>

        {/* Error */}
        {ai.error && !ai.isGenerating && (
          <Surface style={styles.errorCard} elevation={1}>
            <AlertCircle size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Generation failed</Text>
              <Text style={styles.errorBody}>{ai.error}</Text>
            </View>
            <TouchableOpacity onPress={handleGenerate} style={styles.errorRetry}>
              <RefreshCw size={14} color={PURPLE_DEEP} />
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </Surface>
        )}

        {/* STEP 5 — Results */}
        {showResults && ai.generatedText && ai.imageUrl && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Text result */}
            <Surface style={styles.resultCard} elevation={2}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>✍️ Polished Text</Text>
                <TouchableOpacity onPress={handleCopy} style={styles.iconBtn} testID="ai-copy">
                  <Copy size={16} color={PURPLE_DEEP} />
                </TouchableOpacity>
              </View>
              {ai.generatedText.engine && (
                <View
                  style={[
                    styles.engineBadge,
                    ai.generatedText.engine === 'gemini'
                      ? styles.engineBadgeGemini
                      : styles.engineBadgePollinations,
                  ]}
                  testID="ai-engine-badge"
                >
                  <Text
                    style={[
                      styles.engineBadgeText,
                      ai.generatedText.engine === 'gemini'
                        ? styles.engineBadgeTextGemini
                        : styles.engineBadgeTextPollinations,
                    ]}
                  >
                    {ai.generatedText.engine === 'gemini' ? '⚡ Gemini AI' : '🤖 Pollinations AI'}
                  </Text>
                </View>
              )}
              <Text style={styles.resultTitle}>{ai.generatedText.title}</Text>
              <Text style={styles.resultBody}>{ai.generatedText.body}</Text>
              {ai.generatedText.hashtags.length > 0 && (
                <View style={styles.tagRow}>
                  {ai.generatedText.hashtags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={handleRegenerateText}
                style={styles.regenLink}
                disabled={ai.isRegeneratingText}
                testID="ai-regen-text"
              >
                {ai.isRegeneratingText ? (
                  <ActivityIndicator size="small" color={PURPLE_DEEP} />
                ) : (
                  <RefreshCw size={14} color={PURPLE_DEEP} />
                )}
                <Text style={styles.regenLinkText}>Regenerate text</Text>
              </TouchableOpacity>
            </Surface>

            {/* Image result */}
            <Surface style={styles.resultCard} elevation={2}>
              <Text style={styles.resultLabel}>🖼️ Generated Image</Text>
              <View style={styles.imageWrap}>
                {imageError ? (
                  <View style={styles.imagePlaceholder}>
                    <AlertCircle size={24} color={MUTED} />
                    <Text style={styles.imagePlaceholderText}>
                      Image unavailable — try regenerating
                    </Text>
                  </View>
                ) : (
                  <>
                    <Image
                      source={{ uri: ai.imageUrl }}
                      style={styles.resultImage}
                      onLoadStart={() => setImageLoading(true)}
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                    />
                    {imageLoading && (
                      <View style={styles.imageSkeleton}>
                        <ActivityIndicator color={PURPLE_DEEP} />
                      </View>
                    )}
                  </>
                )}
              </View>
              <View style={styles.imageActions}>
                <Button
                  mode="outlined"
                  textColor={PURPLE_DEEP}
                  style={styles.outlinedBtn}
                  icon={() => <RefreshCw size={14} color={PURPLE_DEEP} />}
                  onPress={handleRegenerateImage}
                  testID="ai-regen-image"
                >
                  Regenerate Image
                </Button>
                <TouchableOpacity onPress={scrollToStyles} style={styles.tryStyleLink}>
                  <Text style={styles.tryStyleText}>Try different style</Text>
                </TouchableOpacity>
              </View>
            </Surface>

            {/* STEP 6 — Post Settings */}
            <Surface style={styles.resultCard} elevation={1}>
              <Text style={styles.resultLabel}>📤 Post Settings</Text>

              <Text style={styles.settingsField}>Post Type</Text>
              <View style={styles.segment}>
                {CONTENT_TYPES.map((t) => {
                  const active = contentType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                      onPress={() => setContentType(t.id)}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.settingsField}>Schedule for Later</Text>
                <Switch
                  value={scheduleLater}
                  onValueChange={setScheduleLater}
                  color={PURPLE_DEEP}
                />
              </View>
              {scheduleLater && (
                <View style={styles.scheduleBox}>
                  <Calendar size={16} color={PURPLE_DEEP} />
                  <Text style={styles.scheduleText}>
                    {new Date(Date.now() + 1000 * 60 * 60 * 24).toLocaleString()}
                  </Text>
                </View>
              )}

              <Text style={styles.settingsField}>Audience</Text>
              <View style={styles.chipRow}>
                {(
                  [
                    { id: 'all', label: 'All Subscribers' },
                    { id: 'loyalty', label: 'Loyalty Members' },
                    { id: 'new', label: 'New Subscribers' },
                  ] as { id: Audience; label: string }[]
                ).map((a) => {
                  const active = audience === a.id;
                  return (
                    <Chip
                      key={a.id}
                      selected={active}
                      onPress={() => setAudience(a.id)}
                      style={[styles.audienceChip, active && styles.audienceChipActive]}
                      textStyle={[styles.audienceChipText, active && styles.audienceChipTextActive]}
                      showSelectedCheck={false}
                    >
                      {a.label}
                    </Chip>
                  );
                })}
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.settingsField}>Reward points for engagement</Text>
                <Switch
                  value={rewardPoints}
                  onValueChange={setRewardPoints}
                  color={PURPLE_DEEP}
                />
              </View>
              {rewardPoints && (
                <View style={styles.pointsInputWrap}>
                  <RNTextInput
                    value={pointsValue}
                    onChangeText={(v) => setPointsValue(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    style={styles.pointsInput}
                    placeholder="10"
                    testID="ai-points-input"
                  />
                  <Text style={styles.pointsSuffix}>points per engagement</Text>
                </View>
              )}
            </Surface>

            <View style={{ height: 100 }} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Sticky bottom bar */}
      {showResults && (
        <View style={styles.bottomBar}>
          <Button
            mode="outlined"
            textColor={PURPLE_DEEP}
            style={[styles.bottomBtn, { borderColor: PURPLE_DEEP }]}
            onPress={handleSaveDraft}
            testID="ai-save-draft"
          >
            Save Draft
          </Button>
          <Button
            mode="contained"
            buttonColor={ORANGE}
            textColor="#fff"
            style={styles.bottomBtn}
            onPress={handlePublish}
            testID="ai-publish"
          >
            Publish Now
          </Button>
        </View>
      )}

      {/* Success modal */}
      <Modal visible={successOpen} transparent animationType="fade" onRequestClose={handleViewInFeed}>
        <View style={styles.successBackdrop}>
          <Surface style={styles.successSheet} elevation={4}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={32} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>Your content is live!</Text>
            {ai.generatedText && ai.imageUrl && (
              <View style={styles.successPreview}>
                <Image source={{ uri: ai.imageUrl }} style={styles.successThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successPreviewTitle} numberOfLines={2}>
                    {ai.generatedText.title}
                  </Text>
                  <Text style={styles.successPreviewBody} numberOfLines={2}>
                    {ai.generatedText.body}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.successActions}>
              <Button
                mode="outlined"
                textColor={PURPLE_DEEP}
                style={[styles.successBtn, { borderColor: PURPLE_DEEP }]}
                onPress={handleCreateAnother}
                testID="ai-create-another"
              >
                Create Another
              </Button>
              <Button
                mode="contained"
                buttonColor={PURPLE_DEEP}
                textColor="#fff"
                style={styles.successBtn}
                icon={() => <Eye size={14} color="#fff" />}
                onPress={handleViewInFeed}
                testID="ai-view-feed"
              >
                View in Feed
              </Button>
            </View>
            <TouchableOpacity style={styles.successClose} onPress={() => setSuccessOpen(false)}>
              <X size={18} color={MUTED} />
            </TouchableOpacity>
          </Surface>
        </View>
      </Modal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
}

function StepLabel({ index, title }: { index: number; title: string }) {
  return (
    <View style={styles.stepLabelRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{index}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: TEXT },
  headerSubtitle: { fontSize: 11, color: MUTED, marginTop: 2 },
  betaChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  betaChipText: { fontSize: 10, fontWeight: '700' as const, color: '#92400E' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  stepLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PURPLE_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
  stepTitle: { fontSize: 15, fontWeight: '700' as const, color: TEXT },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F5',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentItemActive: { backgroundColor: PURPLE_DEEP },
  segmentText: { fontSize: 13, fontWeight: '600' as const, color: TEXT },
  segmentTextActive: { color: '#fff' },

  categoryRow: { gap: 12, paddingVertical: 4, paddingRight: 8 },
  categoryItem: { alignItems: 'center', width: 64 },
  categoryItemActive: {},
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryIconActive: { backgroundColor: PURPLE_DEEP, borderColor: PURPLE_DEEP },
  categoryLabel: { fontSize: 11, color: MUTED, marginTop: 6, textAlign: 'center' },
  categoryLabelActive: { color: PURPLE_DEEP, fontWeight: '700' as const },

  inputCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  textArea: {
    minHeight: 120,
    fontSize: 14,
    color: TEXT,
    textAlignVertical: 'top',
    padding: 0,
  },
  charCount: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'right',
    marginTop: 6,
  },

  styleRow: { gap: 12, paddingVertical: 4, paddingRight: 8 },
  styleCard: { alignItems: 'center', width: 92 },
  styleCardActive: {},
  styleSwatch: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 6,
  },
  styleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PURPLE_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleName: { fontSize: 11, color: MUTED, marginTop: 6, textAlign: 'center' },
  styleNameActive: { color: PURPLE_DEEP, fontWeight: '700' as const },

  generateBtn: {
    marginTop: 22,
    borderRadius: 14,
  },
  generateBtnContent: { paddingVertical: 8 },

  errorCard: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorTitle: { fontWeight: '700' as const, color: '#991B1B', fontSize: 13 },
  errorBody: { color: '#7F1D1D', fontSize: 12, marginTop: 2 },
  errorRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  errorRetryText: { color: PURPLE_DEEP, fontWeight: '600' as const, fontSize: 12 },

  resultCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: SURFACE,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: { fontSize: 13, fontWeight: '700' as const, color: TEXT, letterSpacing: 0.2 },
  engineBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
    marginBottom: 4,
  },
  engineBadgeGemini: { backgroundColor: '#E8F0FE' },
  engineBadgePollinations: { backgroundColor: '#E8F5EE' },
  engineBadgeText: { fontSize: 11, fontWeight: '600' as const },
  engineBadgeTextGemini: { color: '#1A73E8' },
  engineBadgeTextPollinations: { color: '#00B246' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 18, fontWeight: '800' as const, color: TEXT, marginTop: 10 },
  resultBody: { fontSize: 14, color: '#334155', marginTop: 8, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: {
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: PURPLE_DEEP, fontSize: 11, fontWeight: '600' as const },
  regenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  regenLinkText: { color: PURPLE_DEEP, fontWeight: '600' as const, fontSize: 13 },

  imageWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EEF0F5',
    aspectRatio: 16 / 9,
  },
  resultImage: { width: '100%', height: '100%' },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0F5',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: { color: MUTED, fontSize: 12 },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  outlinedBtn: { borderRadius: 10 },
  tryStyleLink: { paddingHorizontal: 8, paddingVertical: 6 },
  tryStyleText: { color: PURPLE_DEEP, fontWeight: '600' as const, fontSize: 13 },

  settingsField: { fontSize: 13, fontWeight: '600' as const, color: TEXT, marginTop: 12, marginBottom: 8 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F0FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  scheduleText: { color: PURPLE_DEEP, fontWeight: '600' as const, fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  audienceChip: { backgroundColor: '#EEF0F5' },
  audienceChipActive: { backgroundColor: PURPLE_DEEP },
  audienceChipText: { color: TEXT, fontSize: 12 },
  audienceChipTextActive: { color: '#fff' },
  pointsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  pointsInput: {
    width: 80,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    color: TEXT,
    fontWeight: '600' as const,
  },
  pointsSuffix: { color: MUTED, fontSize: 13 },

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  bottomBtn: { flex: 1, borderRadius: 12 },

  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  successSheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 32,
  },
  successIconWrap: { alignItems: 'center', marginTop: 6 },
  successTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: TEXT,
    textAlign: 'center',
    marginTop: 10,
  },
  successPreview: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: BG,
    borderRadius: 12,
    padding: 10,
    marginTop: 16,
  },
  successThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#EEF0F5' },
  successPreviewTitle: { fontWeight: '700' as const, color: TEXT, fontSize: 14 },
  successPreviewBody: { color: MUTED, fontSize: 12, marginTop: 4 },
  successActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  successBtn: { flex: 1, borderRadius: 12 },
  successClose: { position: 'absolute', right: 14, top: 14, padding: 6 },

  snackbar: { marginBottom: 90 },

  emptyWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' as const, color: TEXT, marginTop: 12 },
  emptyBody: { color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 18, borderRadius: 12, alignSelf: 'stretch' },
});
