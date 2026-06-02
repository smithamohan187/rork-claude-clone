import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { TextInput, ProgressBar, Button, Card, Menu } from 'react-native-paper';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  User,
  Mail,
  Phone,
  Building2,
  Globe,
  MapPin,
  FileText,
  Sparkles,
} from 'lucide-react-native';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#E8F5EE';
const BORDER = '#E5E7EB';
const TEXT = '#111827';
const MUTED = '#6B7280';

const CATEGORIES = [
  'Food',
  'Retail',
  'Fitness',
  'Beauty',
  'Travel',
  'Entertainment',
  'Other',
] as const;

type Category = typeof CATEGORIES[number];

type PlanId = 'basic' | 'standard' | 'premium';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceSub: string;
  maxOffers: string;
  maxEvents: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    priceSub: 'forever',
    maxOffers: '3 offers / month',
    maxEvents: '1 event / month',
    features: ['Business profile', 'Basic analytics', 'Community support'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$19',
    priceSub: 'per month',
    maxOffers: '25 offers / month',
    maxEvents: '10 events / month',
    features: [
      'Everything in Basic',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$49',
    priceSub: 'per month',
    maxOffers: 'Unlimited offers',
    maxEvents: 'Unlimited events',
    features: [
      'Everything in Standard',
      'Dedicated account manager',
      'API access',
      'Verified badge',
    ],
  },
];

export default function BusinessRegistrationScreen() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  const [businessName, setBusinessName] = useState<string>('');
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('basic');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateStep1 = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!emailRegex.test(email.trim())) e.email = 'Enter a valid email';
    const digits = phone.replace(/\D/g, '');
    if (!digits) e.phone = 'Phone is required';
    else if (digits.length < 10) e.phone = 'Enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [fullName, email, phone]);

  const validateStep2 = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!businessName.trim()) e.businessName = 'Business name is required';
    if (!category) e.category = 'Select a category';
    if (!description.trim()) e.description = 'Description is required';
    if (!address.trim()) e.address = 'Address is required';
    if (!city.trim()) e.city = 'City is required';
    if (!country.trim()) e.country = 'Country is required';
    if (website.trim() && !/^https?:\/\/.+\..+/.test(website.trim())) {
      e.website = 'Enter a valid URL (https://...)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [businessName, category, description, website, address, city, country]);

  const onNext = useCallback(() => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  }, [step, validateStep1, validateStep2]);

  const onBack = useCallback(() => {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }, [step, router]);

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    console.log('[BusinessRegistration] submitting', {
      fullName,
      email,
      phone,
      businessName,
      category,
      selectedPlan,
    });
    try {
      await new Promise((r) => setTimeout(r, 1200));
      Alert.alert(
        'Submitted for Approval',
        'Your business account has been submitted. Our team will review it within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/profile' as never),
          },
        ]
      );
    } catch (err) {
      console.log('[BusinessRegistration] error', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [fullName, email, phone, businessName, category, selectedPlan, router]);

  const progress = useMemo(() => step / 3, [step]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          testID="br-back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Register Your Business</Text>
          <Text style={styles.headerStep}>Step {step} of 3</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar progress={progress} color={PURPLE} style={styles.progress} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View>
              <Text style={styles.sectionTitle}>Account Details</Text>
              <Text style={styles.sectionSub}>
                Tell us about the owner of the business.
              </Text>

              <TextInput
                label="Owner Full Name"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={styles.input}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <User size={20} color={MUTED} />} />}
                error={!!errors.fullName}
                testID="br-fullName"
              />
              {errors.fullName && <Text style={styles.err}>{errors.fullName}</Text>}

              <TextInput
                label="Business Email"
                value={email}
                onChangeText={(t) => setEmail(t.toLowerCase())}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <Mail size={20} color={MUTED} />} />}
                error={!!errors.email}
                testID="br-email"
              />
              {errors.email && <Text style={styles.err}>{errors.email}</Text>}

              <TextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <Phone size={20} color={MUTED} />} />}
                error={!!errors.phone}
                testID="br-phone"
              />
              {errors.phone && <Text style={styles.err}>{errors.phone}</Text>}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.sectionTitle}>Business Details</Text>
              <Text style={styles.sectionSub}>
                Help customers discover and learn about your business.
              </Text>

              <TextInput
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                mode="outlined"
                style={styles.input}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <Building2 size={20} color={MUTED} />} />}
                error={!!errors.businessName}
                testID="br-businessName"
              />
              {errors.businessName && <Text style={styles.err}>{errors.businessName}</Text>}

              <Menu
                visible={categoryOpen}
                onDismiss={() => setCategoryOpen(false)}
                anchor={
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCategoryOpen(true)}
                    testID="br-category"
                  >
                    <View pointerEvents="none">
                      <TextInput
                        label="Category"
                        value={category ?? ''}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                        outlineColor={BORDER}
                        activeOutlineColor={PURPLE}
                        right={
                          <TextInput.Icon
                            icon={() => <ChevronDown size={20} color={MUTED} />}
                          />
                        }
                        error={!!errors.category}
                      />
                    </View>
                  </TouchableOpacity>
                }
                contentStyle={styles.menu}
              >
                {CATEGORIES.map((c) => (
                  <Menu.Item
                    key={c}
                    onPress={() => {
                      setCategory(c);
                      setCategoryOpen(false);
                    }}
                    title={c}
                    titleStyle={category === c ? styles.menuItemActive : undefined}
                  />
                ))}
              </Menu>
              {errors.category && <Text style={styles.err}>{errors.category}</Text>}

              <TextInput
                label="Business Description"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.multiline]}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <FileText size={20} color={MUTED} />} />}
                error={!!errors.description}
                testID="br-description"
              />
              {errors.description && <Text style={styles.err}>{errors.description}</Text>}

              <TextInput
                label="Website URL (optional)"
                value={website}
                onChangeText={setWebsite}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://example.com"
                style={styles.input}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <Globe size={20} color={MUTED} />} />}
                error={!!errors.website}
                testID="br-website"
              />
              {errors.website && <Text style={styles.err}>{errors.website}</Text>}

              <TextInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                mode="outlined"
                style={styles.input}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                left={<TextInput.Icon icon={() => <MapPin size={20} color={MUTED} />} />}
                error={!!errors.address}
                testID="br-address"
              />
              {errors.address && <Text style={styles.err}>{errors.address}</Text>}

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <TextInput
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={BORDER}
                    activeOutlineColor={PURPLE}
                    error={!!errors.city}
                    testID="br-city"
                  />
                  {errors.city && <Text style={styles.err}>{errors.city}</Text>}
                </View>
                <View style={styles.rowGap} />
                <View style={styles.rowItem}>
                  <TextInput
                    label="Country"
                    value={country}
                    onChangeText={setCountry}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={BORDER}
                    activeOutlineColor={PURPLE}
                    error={!!errors.country}
                    testID="br-country"
                  />
                  {errors.country && <Text style={styles.err}>{errors.country}</Text>}
                </View>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.sectionTitle}>Choose a Plan</Text>
              <Text style={styles.sectionSub}>
                Pick the plan that fits your business. You can change later.
              </Text>

              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.9}
                    onPress={() => setSelectedPlan(plan.id)}
                    testID={`br-plan-${plan.id}`}
                  >
                    <Card
                      style={[
                        styles.planCard,
                        selected && styles.planCardSelected,
                      ]}
                      mode="outlined"
                    >
                      <Card.Content>
                        <View style={styles.planHeader}>
                          <View style={styles.planHeaderLeft}>
                            {plan.highlight && (
                              <View style={styles.popularBadge}>
                                <Sparkles size={12} color={PURPLE} />
                                <Text style={styles.popularText}>Most Popular</Text>
                              </View>
                            )}
                            <Text style={styles.planName}>{plan.name}</Text>
                            <View style={styles.priceRow}>
                              <Text style={styles.price}>{plan.price}</Text>
                              <Text style={styles.priceSub}> {plan.priceSub}</Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.radio,
                              selected && styles.radioSelected,
                            ]}
                          >
                            {selected && <Check size={14} color="#fff" />}
                          </View>
                        </View>

                        <View style={styles.planMetaRow}>
                          <Text style={styles.planMeta}>• {plan.maxOffers}</Text>
                          <Text style={styles.planMeta}>• {plan.maxEvents}</Text>
                        </View>

                        <View style={styles.featureList}>
                          {plan.features.map((f) => (
                            <View key={f} style={styles.featureItem}>
                              <Check size={14} color={PURPLE} />
                              <Text style={styles.featureText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.note}>
                Your account will be reviewed within 24 hours.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 3 ? (
            <Button
              mode="contained"
              onPress={onNext}
              buttonColor={PURPLE}
              textColor="#fff"
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
              testID="br-next"
            >
              Next
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting}
              buttonColor={PURPLE}
              textColor="#fff"
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
              testID="br-submit"
            >
              Submit for Approval
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  headerStep: { fontSize: 12, color: MUTED, marginTop: 2 },
  progressWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  progress: { height: 6, borderRadius: 3, backgroundColor: PURPLE_LIGHT },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: TEXT, marginTop: 8 },
  sectionSub: { fontSize: 14, color: MUTED, marginTop: 6, marginBottom: 16 },
  input: { backgroundColor: '#fff', marginTop: 12 },
  multiline: { minHeight: 100 },
  err: { color: '#DC2626', fontSize: 12, marginTop: 6, marginLeft: 4 },
  row: { flexDirection: 'row' },
  rowItem: { flex: 1 },
  rowGap: { width: 12 },
  menu: { marginTop: 56, backgroundColor: '#fff' },
  menuItemActive: { color: PURPLE, fontWeight: '700' as const },
  planCard: {
    marginTop: 14,
    borderRadius: 16,
    borderColor: BORDER,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  planCardSelected: {
    borderColor: PURPLE,
    borderWidth: 2,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planHeaderLeft: { flex: 1 },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  popularText: { color: PURPLE, fontSize: 11, fontWeight: '700' as const },
  planName: { fontSize: 18, fontWeight: '700' as const, color: TEXT },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  price: { fontSize: 24, fontWeight: '800' as const, color: TEXT },
  priceSub: { fontSize: 13, color: MUTED },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: PURPLE, borderColor: PURPLE },
  planMetaRow: { flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  planMeta: { fontSize: 13, color: MUTED, fontWeight: '600' as const },
  featureList: { marginTop: 12, gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: TEXT },
  note: {
    textAlign: 'center',
    color: MUTED,
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  primaryBtn: { borderRadius: 12 },
  primaryBtnContent: { height: 52 },
});
