import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Icon, TextInput, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StarRatingInput } from './StarRatingInput';

const ACCENT = '#1A5C35';
const DARK_TEXT = '#1A5C35';
const MUTED_TEXT = '#1A5C35';
const AMBER_BG = '#FEF3C7';
const AMBER_FG = '#854F0B';
const DANGER = '#E24B4A';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  businessName: string;
  businessId: string;
  existingRating: number | null;
  existingReview: string;
  onSubmit: (stars: number, review: string) => Promise<void>;
  onDelete: () => Promise<void>;
  submitting: boolean;
  isSubscriber: boolean;
  onSubscribePress?: () => void;
}

export function RatingBottomSheet({
  visible,
  onDismiss,
  businessName,
  existingRating,
  existingReview,
  onSubmit,
  onDelete,
  submitting,
  isSubscriber,
  onSubscribePress,
}: Props) {
  const [localStars, setLocalStars] = useState<number>(existingRating ?? 0);
  const [localReview, setLocalReview] = useState<string>(existingReview ?? '');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setLocalStars(existingRating ?? 0);
      setLocalReview(existingReview ?? '');
    }
  }, [visible, existingRating, existingReview]);

  const canSubmit = localStars > 0 && !submitting && isSubscriber;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(localStars, localReview.trim());
  };

  const handleDelete = () => {
    Alert.alert('Remove Rating', 'Are you sure you want to remove your rating?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void onDelete();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      testID="rating-bottom-sheet"
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={20}
          >
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {existingRating ? 'Update your rating' : 'Rate this business'}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {businessName}
                  </Text>
                </View>
                <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn} testID="rating-sheet-close">
                  <Icon source="close" size={22} color={MUTED_TEXT} />
                </Pressable>
              </View>

              {!isSubscriber ? (
                <View style={styles.warnStrip}>
                  <Icon source="information-outline" size={18} color={AMBER_FG} />
                  <Text style={styles.warnText}>
                    Subscribe to {businessName} to leave a rating
                  </Text>
                  {onSubscribePress ? (
                    <Pressable
                      onPress={onSubscribePress}
                      style={styles.warnBtn}
                      testID="rating-sheet-subscribe"
                    >
                      <Text style={styles.warnBtnText}>Subscribe</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Your rating</Text>
                <StarRatingInput
                  value={localStars}
                  onChange={setLocalStars}
                  size={36}
                  disabled={!isSubscriber}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Write a review (optional)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="What did you love? Any tips for other subscribers?"
                  value={localReview}
                  onChangeText={setLocalReview}
                  maxLength={300}
                  multiline
                  numberOfLines={3}
                  disabled={!isSubscriber}
                  outlineColor="#E8F5EE"
                  activeOutlineColor={ACCENT}
                  style={styles.textInput}
                  testID="rating-review-input"
                />
                <Text style={styles.counter}>{localReview.length}/300</Text>
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={!canSubmit}
                buttonColor={ACCENT}
                style={styles.submitBtn}
                contentStyle={styles.submitBtnContent}
                testID="rating-submit-btn"
              >
                {submitting ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : existingRating ? (
                  'Update Rating'
                ) : (
                  'Submit Rating'
                )}
              </Button>

              {existingRating !== null ? (
                <Pressable
                  onPress={handleDelete}
                  style={styles.deleteBtn}
                  disabled={submitting}
                  testID="rating-delete-btn"
                >
                  <Text style={styles.deleteText}>Remove my rating</Text>
                </Pressable>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    minHeight: 380,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8F5EE',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK_TEXT,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED_TEXT,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  warnStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AMBER_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: AMBER_FG,
    fontWeight: '600',
  },
  warnBtn: {
    backgroundColor: AMBER_FG,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  warnBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 12,
    color: MUTED_TEXT,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    fontSize: 13,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: MUTED_TEXT,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 20,
    borderRadius: 12,
  },
  submitBtnContent: {
    paddingVertical: 4,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteText: {
    color: DANGER,
    fontSize: 13,
    fontWeight: '600',
  },
});
