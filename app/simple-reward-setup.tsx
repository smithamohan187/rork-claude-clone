import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ImagePlus,
  Trash2,
  Check,
  Sparkles,
  Type,
  Tag,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function SimpleRewardSetupScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [promoTitle, setPromoTitle] = useState<string>('');
  const [promoDescription, setPromoDescription] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      animateIn();
    }
  };

  const removeImage = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    setImageUri(null);
  };

  const handlePublish = () => {
    if (!imageUri) {
      Alert.alert('Image Required', 'Please upload an image for your promotion.');
      return;
    }
    if (!promoTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your promotion.');
      return;
    }
    Alert.alert(
      'Reward Published!',
      'Your simple reward promotion has been created successfully.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="back-button"
          >
            <ArrowLeft size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Simple Reward Setup</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Sparkles size={24} color={Colors.teal} />
          </View>
          <Text style={styles.heroTitle}>Create Your Promotion</Text>
          <Text style={styles.heroSubtitle}>
            Upload an eye-catching image and add details to attract customers to your reward offer.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ImagePlus size={18} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>Upload an image that represents your promotion</Text>
          </View>

          {!imageUri ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={pickImage}
              activeOpacity={0.7}
              testID="upload-image-button"
            >
              <View style={styles.uploadIconCircle}>
                <ImagePlus size={32} color={Colors.teal} />
              </View>
              <Text style={styles.uploadText}>Tap to upload image</Text>
              <Text style={styles.uploadHint}>JPG, PNG — recommended 16:9 ratio</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View
              style={[
                styles.imagePreviewWrap,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
              <View style={styles.imageOverlay}>
                <TouchableOpacity
                  style={styles.changeImageBtn}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <ImagePlus size={16} color="#fff" />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={removeImage}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={18} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>Promotion Title</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20% Off Your First Visit"
            placeholderTextColor={Colors.textTertiary}
            value={promoTitle}
            onChangeText={setPromoTitle}
            maxLength={80}
            testID="promo-title-input"
          />
          <Text style={styles.charCount}>{promoTitle.length}/80</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Tag size={18} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>Description (Optional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add details about your promotion..."
            placeholderTextColor={Colors.textTertiary}
            value={promoDescription}
            onChangeText={setPromoDescription}
            multiline
            numberOfLines={4}
            maxLength={300}
            textAlignVertical="top"
            testID="promo-description-input"
          />
          <Text style={styles.charCount}>{promoDescription.length}/300</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.publishBtn,
            (!imageUri || !promoTitle.trim()) && styles.publishBtnDisabled,
          ]}
          onPress={handlePublish}
          activeOpacity={0.8}
          testID="publish-button"
        >
          <Check size={20} color="#fff" />
          <Text style={styles.publishBtnText}>Publish Promotion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.banner,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.teal + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.1,
    flex: 1,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.teal + '40',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal + '08',
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.teal + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  uploadHint: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  imagePreviewWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
  },
  imageOverlay: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  removeImageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(237,73,86,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    textAlign: 'right' as const,
    marginTop: 6,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.teal,
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.1,
  },
});

