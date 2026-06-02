import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  PenTool,
  Send,
  Store,
  Users,
  Target,
  Gift,
  CalendarDays,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

type IndustryType = 'retail' | 'food_beverage' | 'health_beauty' | 'services' | 'entertainment' | 'other';

const industryOptions: { value: IndustryType; label: string }[] = [
  { value: 'retail', label: 'Retail & Shopping' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'health_beauty', label: 'Health & Beauty' },
  { value: 'services', label: 'Professional Services' },
  { value: 'entertainment', label: 'Entertainment & Leisure' },
  { value: 'other', label: 'Other' },
];

const goalOptions = [
  { id: 'retention', label: 'Customer Retention', icon: Users },
  { id: 'acquisition', label: 'New Customer Acquisition', icon: Target },
  { id: 'spend', label: 'Increase Average Spend', icon: DollarSign },
  { id: 'engagement', label: 'Community Engagement', icon: MessageSquare },
  { id: 'loyalty', label: 'Build Brand Loyalty', icon: Gift },
  { id: 'events', label: 'Promote Events', icon: CalendarDays },
];

export default function PersonalisedRequestScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const successAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.3)).current;

  const [businessName, setBusinessName] = useState<string>('');
  const [industry, setIndustry] = useState<IndustryType | null>(null);
  const [showIndustryPicker, setShowIndustryPicker] = useState<boolean>(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customerBase, setCustomerBase] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const toggleGoal = useCallback((goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!businessName.trim()) {
      Alert.alert('Missing Info', 'Please enter your business name.');
      return;
    }
    if (!industry) {
      Alert.alert('Missing Info', 'Please select your industry.');
      return;
    }
    if (selectedGoals.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one reward goal.');
      return;
    }

    Animated.parallel([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    setIsSubmitted(true);
  }, [businessName, industry, selectedGoals, successAnim, successScale]);

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.successContainer}>
          <Animated.View
            style={[
              styles.successCard,
              {
                opacity: successAnim,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={56} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successDesc}>
              Our team will review your personalised rewards brief and get back to you within 2-3 business days with a tailored program.
            </Text>
            <View style={styles.successSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Business</Text>
                <Text style={styles.summaryValue}>{businessName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Industry</Text>
                <Text style={styles.summaryValue}>
                  {industryOptions.find(i => i.value === industry)?.label}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Goals</Text>
                <Text style={styles.summaryValue}>
                  {selectedGoals
                    .map(g => goalOptions.find(o => o.id === g)?.label)
                    .join(', ')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Text style={styles.successBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Personalised Request</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroSection}>
            <View style={styles.heroIconWrap}>
              <PenTool size={28} color="#00B246" />
            </View>
            <Text style={styles.heroTitle}>Tell Us About Your Business</Text>
            <Text style={styles.heroSubtitle}>
              Share your goals and preferences, and we'll craft a rewards program designed just for you.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Business Details</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIconRow}>
                <Store size={18} color={Colors.textSecondary} />
                <Text style={styles.inputLabel}>Business Name</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your business name"
                placeholderTextColor={Colors.textTertiary}
                value={businessName}
                onChangeText={setBusinessName}
                testID="business-name-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIconRow}>
                <Target size={18} color={Colors.textSecondary} />
                <Text style={styles.inputLabel}>Industry</Text>
              </View>
              <TouchableOpacity
                style={styles.pickerBtn}
                activeOpacity={0.7}
                onPress={() => setShowIndustryPicker(!showIndustryPicker)}
              >
                <Text
                  style={[
                    styles.pickerBtnText,
                    !industry && styles.pickerPlaceholder,
                  ]}
                >
                  {industry
                    ? industryOptions.find(i => i.value === industry)?.label
                    : 'Select your industry'}
                </Text>
                {showIndustryPicker ? (
                  <ChevronUp size={18} color={Colors.textSecondary} />
                ) : (
                  <ChevronDown size={18} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
              {showIndustryPicker && (
                <View style={styles.pickerDropdown}>
                  {industryOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pickerOption,
                        industry === opt.value && styles.pickerOptionActive,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setIndustry(opt.value);
                        setShowIndustryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          industry === opt.value && styles.pickerOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIconRow}>
                <Users size={18} color={Colors.textSecondary} />
                <Text style={styles.inputLabel}>Estimated Customer Base</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 500 regular customers"
                placeholderTextColor={Colors.textTertiary}
                value={customerBase}
                onChangeText={setCustomerBase}
                testID="customer-base-input"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Reward Goals</Text>
            <Text style={styles.sectionHint}>Select all that apply</Text>

            <View style={styles.goalsGrid}>
              {goalOptions.map(goal => {
                const GoalIcon = goal.icon;
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.goalChip,
                      isSelected && styles.goalChipActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleGoal(goal.id)}
                    testID={`goal-${goal.id}`}
                  >
                    <GoalIcon
                      size={18}
                      color={isSelected ? '#fff' : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.goalChipText,
                        isSelected && styles.goalChipTextActive,
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Budget & Preferences</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIconRow}>
                <DollarSign size={18} color={Colors.textSecondary} />
                <Text style={styles.inputLabel}>Monthly Budget (Optional)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. £200/month"
                placeholderTextColor={Colors.textTertiary}
                value={budget}
                onChangeText={setBudget}
                testID="budget-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIconRow}>
                <MessageSquare size={18} color={Colors.textSecondary} />
                <Text style={styles.inputLabel}>Additional Notes</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Tell us anything else about what you'd like in your rewards program..."
                placeholderTextColor={Colors.textTertiary}
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                testID="notes-input"
              />
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.85}
            onPress={handleSubmit}
            testID="submit-request-button"
          >
            <Send size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  flex: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EDEBF4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F1FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 38,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 28,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#00B246' + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EDEBF4',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  inputGroup: {
    marginTop: 14,
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  textInput: {
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#EDEBF4',
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#EDEBF4',
  },
  pickerBtnText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  pickerPlaceholder: {
    color: Colors.textTertiary,
    fontWeight: '400' as const,
  },
  pickerDropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEBF4',
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F1FA',
  },
  pickerOptionActive: {
    backgroundColor: '#00B246' + '0D',
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerOptionTextActive: {
    color: '#00B246',
    fontWeight: '600' as const,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F8F7FC',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#EDEBF4',
  },
  goalChipActive: {
    backgroundColor: '#00B246',
    borderColor: '#00B246',
  },
  goalChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  goalChipTextActive: {
    color: '#fff',
  },
  bottomPadding: {
    height: 20,
  },
  footerSafe: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDEBF4',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00B246',
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.2,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#EDEBF4',
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B981' + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  successSummary: {
    width: '100%',
    backgroundColor: '#F8F7FC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    minWidth: 70,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  successBtn: {
    backgroundColor: '#00B246',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

