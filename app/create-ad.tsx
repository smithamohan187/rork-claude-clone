import React, { useState, useCallback, useRef } from 'react';
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
import { X, Tag, FileText, Type, ChevronDown, Check, ImagePlus, Users, Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { categories, personalUsers, bizComs as mockBizComs } from '@/mocks/data';
import { BizCom, BizComFollower } from '@/types';

const CREATED_BIZCOMS_KEY = 'created_bizcoms';

const AD_CATEGORIES = categories.filter(c => c !== 'All');

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1556740758-90de940e0603?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1556741533-411cf82e4e2d?w=600&h=600&fit=crop',
];

const MOCK_FOLLOWERS: BizComFollower[] = personalUsers.map((u) => ({
  id: u.id,
  name: u.name,
  avatar: u.avatar,
  joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  email: u.email ?? `${u.username}@email.com`,
  phone: u.phone ?? '',
}));

export default function CreateAdScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [existingHasPrimary, setExistingHasPrimary] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const checkPrimary = async () => {
      try {
        const stored = await AsyncStorage.getItem(CREATED_BIZCOMS_KEY);
        const existing: any[] = stored ? JSON.parse(stored) : [];
        const hasPrimary = existing.some((bc: any) => bc.bizComType === 'primary');
        const mockHasBizComs = mockBizComs.some((bc) => bc.ownerId === currentUser.id);
        setExistingHasPrimary(hasPrimary || mockHasBizComs);
        if (!hasPrimary && !mockHasBizComs) {
          setIsPrimary(true);
        }
        console.log('Primary check - hasPrimary:', hasPrimary, 'mockHasBizComs:', mockHasBizComs);
      } catch (e) {
        console.log('Error checking primary:', e);
      }
    };
    checkPrimary();
  }, [currentUser.id]);

  const isFormValid = title.trim() && description.trim() && selectedCategory && (selectedImage || uploadedImages.length > 0);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        setUploadedImages(prev => [...prev, ...newUris].slice(0, 5));
        if (!selectedImage) {
          setSelectedImage(newUris[0]);
        }
        console.log('Picked images:', newUris.length);
      }
    } catch (e) {
      console.log('Image picker error:', e);
      Alert.alert('Error', 'Could not open image picker.');
    }
  }, [selectedImage]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploadedImages(prev => [...prev, uri].slice(0, 5));
        if (!selectedImage) {
          setSelectedImage(uri);
        }
        console.log('Took photo:', uri);
      }
    } catch (e) {
      console.log('Camera error:', e);
      Alert.alert('Error', 'Could not open camera.');
    }
  }, [selectedImage]);

  const removeUploadedImage = useCallback((uri: string) => {
    setUploadedImages(prev => prev.filter(u => u !== uri));
    if (selectedImage === uri) {
      setSelectedImage('');
    }
  }, [selectedImage]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      Alert.alert('Missing Fields', 'Please fill in all fields and select an image.');
      return;
    }

    setIsSubmitting(true);

    const randomFollowers = MOCK_FOLLOWERS.slice(0, Math.floor(Math.random() * 3) + 2);

    const newBizCom = {
      id: `bc_custom_${Date.now()}`,
      name: title.trim(),
      avatar: selectedImage,
      members: randomFollowers.length,
      category: selectedCategory,
      description: description.trim(),
      ownerId: currentUser.id,
      followers: randomFollowers,
      bizComType: isPrimary ? 'primary' : 'complimenting',
      uploadedImages,
      createdAt: new Date().toISOString(),
      status: 'active' as const,
      views: 0,
      clicks: 0,
      isUserCreated: true,
    };

    try {
      const stored = await AsyncStorage.getItem(CREATED_BIZCOMS_KEY);
      const existing: BizCom[] = stored ? JSON.parse(stored) : [];
      const updated = [...existing, newBizCom];
      await AsyncStorage.setItem(CREATED_BIZCOMS_KEY, JSON.stringify(updated));
      console.log('Saved new BizCom:', newBizCom.id, newBizCom.name);
    } catch (e) {
      console.log('Error saving BizCom:', e);
    }

    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(800),
    ]).start(() => {
      Alert.alert(
        'Promotion Saved!',
        `Your promotion "${title}" has been created and saved.`,
        [{ text: 'Great', onPress: () => router.back() }]
      );
    });
  }, [isFormValid, title, description, selectedCategory, selectedImage, successAnim, router, currentUser.id, isPrimary, uploadedImages]);

  const successScale = successAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="close-create-ad">
            <X size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishBtn, !isFormValid && styles.publishBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            testID="publish-ad"
          >
            <Text style={[styles.publishText, !isFormValid && styles.publishTextDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitleCentered}>Create New Promotion</Text>
      </SafeAreaView>

      {isSubmitting ? (
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={48} color={Colors.navyDark} />
          </Animated.View>
          <Text style={styles.successText}>Saving your promotion...</Text>
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
            <View style={styles.sellerRow}>
              <Image source={{ uri: currentUser.avatar }} style={styles.sellerAvatar} />
              <View>
                <Text style={styles.sellerName}>{currentUser.name}</Text>
                <Text style={styles.sellerLabel}>New Promotion</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Promotion Image</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageRow}
            >
              {SAMPLE_IMAGES.map((img) => (
                <TouchableOpacity
                  key={img}
                  style={[styles.imageThumbnail, selectedImage === img && styles.imageThumbnailSelected]}
                  onPress={() => setSelectedImage(img)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: img }} style={styles.thumbImage} contentFit="cover" />
                  {selectedImage === img && (
                    <View style={styles.imageCheck}>
                      <Check size={16} color={Colors.navyDark} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="cover" />
                <TouchableOpacity style={styles.changeImageBtn} onPress={() => setSelectedImage('')}>
                  <ImagePlus size={16} color={Colors.accent} />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Type size={18} color={Colors.accent} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Promotion name"
                placeholderTextColor={Colors.textTertiary}
                value={title}
                onChangeText={setTitle}
                testID="ad-title-input"
              />
            </View>

            <View style={[styles.inputGroup, styles.inputGroupTall]}>
              <View style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]}>
                <FileText size={18} color={Colors.accent} />
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your promotion..."
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                testID="ad-description-input"
              />
            </View>

            <TouchableOpacity
              style={styles.inputGroup}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              activeOpacity={0.7}
              testID="ad-category-picker"
            >
              <View style={styles.inputIcon}>
                <Tag size={18} color={Colors.accent} />
              </View>
              <Text style={[styles.pickerText, !selectedCategory && { color: Colors.textTertiary }]}>
                {selectedCategory || 'Select a category'}
              </Text>
              <ChevronDown size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryList}>
                {AD_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, selectedCategory === cat && styles.categoryOptionActive]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.categoryOptionText, selectedCategory === cat && styles.categoryOptionTextActive]}>
                      {cat}
                    </Text>
                    {selectedCategory === cat && <Check size={16} color={Colors.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}



            <Text style={styles.sectionLabel}>Upload Pictures</Text>

            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.7} testID="pick-image-btn">
                <Upload size={22} color={Colors.accent} />
                <Text style={styles.uploadBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto} activeOpacity={0.7} testID="take-photo-btn">
                <Camera size={22} color={Colors.accent} />
                <Text style={styles.uploadBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>

            {uploadedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.uploadedRow}>
                {uploadedImages.map((uri, idx) => (
                  <View key={uri + idx} style={styles.uploadedThumbWrap}>
                    <TouchableOpacity
                      style={[styles.uploadedThumb, selectedImage === uri && styles.uploadedThumbSelected]}
                      onPress={() => setSelectedImage(uri)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri }} style={styles.uploadedThumbImage} contentFit="cover" />
                      {selectedImage === uri && (
                        <View style={styles.imageCheck}>
                          <Check size={16} color={Colors.navyDark} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeThumbBtn} onPress={() => removeUploadedImage(uri)}>
                      <X size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {uploadedImages.length === 0 && (
              <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImage} activeOpacity={0.7}>
                <ImagePlus size={36} color={Colors.textTertiary} />
                <Text style={styles.uploadPlaceholderText}>Tap to upload promotion images</Text>
                <Text style={styles.uploadPlaceholderSub}>Up to 5 images</Text>
              </TouchableOpacity>
            )}

            <View style={styles.tipCard}>
              <Users size={20} color={Colors.accent} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Followers will be assigned automatically</Text>
                <Text style={styles.tipText}>Your new promotion will be saved with follower contact details visible.</Text>
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
  headerTitleCentered: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    textAlign: 'center' as const,
    paddingBottom: 10,
    letterSpacing: -0.3,
  },
  publishBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
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
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  sellerLabel: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '400' as const,
    marginTop: 1,
    letterSpacing: 0.1,
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
    paddingBottom: 16,
  },
  imageThumbnail: {
    width: 72,
    height: 72,
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
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
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
    borderRadius: 16,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.accent,
    letterSpacing: 0.1,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputGroupTall: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
    paddingRight: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  textAreaSmall: {
    minHeight: 70,
    paddingTop: 14,
  },
  uploadRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 16,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  uploadedRow: {
    gap: 10,
    paddingBottom: 16,
  },
  uploadedThumbWrap: {
    position: 'relative' as const,
  },
  uploadedThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  uploadedThumbSelected: {
    borderColor: Colors.accent,
  },
  uploadedThumbImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  removeThumbBtn: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E53935',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  uploadPlaceholder: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 32,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed' as const,
    gap: 6,
  },
  uploadPlaceholderText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  uploadPlaceholderSub: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
  },
  categoryList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    marginTop: -4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryOptionActive: {
    backgroundColor: Colors.accentLight,
  },
  categoryOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  categoryOptionTextActive: {
    color: Colors.navyDark,
    fontWeight: '600' as const,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentLight,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.navyDark,
    marginBottom: 4,
    letterSpacing: 0,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
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
  typeToggleContainer: {
    gap: 10,
    marginBottom: 16,
  },
  typeToggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  typeToggleOptionPrimary: {
    borderColor: '#1B5E20',
    backgroundColor: '#1B5E20' + '08',
  },
  typeToggleOptionComplimenting: {
    borderColor: Colors.navyMid,
    backgroundColor: Colors.navyDark + '06',
  },
  typeToggleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggleIconPrimary: {
    backgroundColor: '#1B5E20' + '18',
  },
  typeToggleIconComplimenting: {
    backgroundColor: Colors.navyDark + '12',
  },
  typeToggleIconInactive: {
    backgroundColor: Colors.surfaceAlt,
  },
  typeToggleInfo: {
    flex: 1,
  },
  typeToggleTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: -0.1,
  },
  typeToggleTitlePrimary: {
    color: '#1B5E20',
  },
  typeToggleTitleComplimenting: {
    color: Colors.navyMid,
  },
  typeToggleDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  typeToggleRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggleRadioActive: {
    borderColor: '#1B5E20',
  },
  typeToggleRadioActiveComp: {
    borderColor: Colors.navyMid,
  },
  typeToggleRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1B5E20',
  },
  typeToggleRadioDotComp: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.navyMid,
  },
  primaryInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20' + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  primaryInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1B5E20',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});

