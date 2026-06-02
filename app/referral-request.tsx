import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  X,
  Search,
  Check,
  ChevronRight,
  Send,
  Heart,
  Tag,
  Sparkles,
  Smartphone,
  AtSign,
  MessageSquare,
  CircleCheck,
  Forward,
  Users,
  Gift,
  Award,
  ImagePlus,
  Star,
  Mail,
  Share,
  XCircle,
  CheckCircle,
  Building2,
  UserPlus,
  Globe,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useReferrals } from '@/contexts/ReferralContext';
import { personalUsers, phoneContacts, rewardRules, currentBusinessUser } from '@/mocks/data';
import type { PhoneContact } from '@/mocks/data';
import type { User, ReferralRequestType, ReferredParty } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReferralTypeConfig {
  key: ReferralRequestType;
  title: string;
  heading: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  description: string;
  hasPoints: boolean;
  hasCustomImages: boolean;
}

const REFERRAL_TYPES: ReferralTypeConfig[] = [
  {
    key: 'generic',
    title: 'Generic Referral',
    heading: 'Generic Referral Request',
    icon: <Tag size={22} color="#3B82F6" />,
    iconColor: '#3B82F6',
    iconBg: '#3B82F614',
    accentColor: '#3B82F6',
    description: 'Send a referral request with reward points incentive to your BizCom members.',
    hasPoints: true,
    hasCustomImages: false,
  },
  {
    key: 'goodwill',
    title: 'Goodwill Referral',
    heading: 'Goodwill Referral Request',
    icon: <Heart size={22} color="#F59E0B" />,
    iconColor: '#F59E0B',
    iconBg: '#F59E0B14',
    accentColor: '#F59E0B',
    description: 'Send a goodwill referral request without any points or rewards attached.',
    hasPoints: false,
    hasCustomImages: false,
  },
  {
    key: 'custom',
    title: 'Custom Referral',
    heading: 'Custom Referral Request',
    icon: <Sparkles size={22} color="#EC4899" />,
    iconColor: '#EC4899',
    iconBg: '#EC489914',
    accentColor: '#EC4899',
    description: 'Upload custom offer images for the referrer and new member.',
    hasPoints: false,
    hasCustomImages: true,
  },
];

const MOCK_CUSTOM_IMAGES = {
  referralOffer: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
  newMemberOffer: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop',
};

const referralPoints = rewardRules.find(r => r.action === 'Refer a friend')?.points ?? 50;
const welcomePoints = rewardRules.find(r => r.action === 'Welcome')?.points ?? 25;

export default function ReferralRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { currentUser, accountType, businessProfileData } = useAuth();
  const { createReferralRequest } = useReferrals();

  const initialType = useMemo<ReferralRequestType | null>(() => {
    if (params.type === 'generic' || params.type === 'goodwill' || params.type === 'custom') {
      return params.type;
    }
    return null;
  }, [params.type]);

  const [selectedType, setSelectedType] = useState<ReferralRequestType | null>(initialType);
  const [step, setStep] = useState<number>(initialType ? 2 : 1);

  useEffect(() => {
    if (params.type === 'generic' || params.type === 'goodwill' || params.type === 'custom') {
      if (!selectedType) {
        setSelectedType(params.type);
        setStep(prev => prev === 1 ? 2 : prev);
        console.log(`[REFERRAL] Synced selectedType from params: ${params.type}`);
      }
    }
  }, [params.type, selectedType]);
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);
  const [externalContacts, setExternalContacts] = useState<{ contact: PhoneContact; method: 'sms' | 'email' | 'whatsapp' | 'facebook' }[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [personalMessage, setPersonalMessage] = useState<string>('');
  const [customReferralImage, setCustomReferralImage] = useState<string>(MOCK_CUSTOM_IMAGES.referralOffer);
  const [customNewMemberImage, setCustomNewMemberImage] = useState<string>(MOCK_CUSTOM_IMAGES.newMemberOffer);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);

  const [mockStep, setMockStep] = useState<number>(0);
  const [mockForwardContacts, setMockForwardContacts] = useState<User[]>([]);
  const [mockForwardExternals, setMockForwardExternals] = useState<{ contact: PhoneContact; method: 'sms' | 'email' | 'whatsapp' | 'facebook' }[]>([]);
  const [mockForwardSearch, setMockForwardSearch] = useState<string>('');
  const [mockForwardMessage, setMockForwardMessage] = useState<string>('');

  const typeConfig = useMemo(() => {
    if (!selectedType) return REFERRAL_TYPES[0];
    return REFERRAL_TYPES.find(t => t.key === selectedType) ?? REFERRAL_TYPES[0];
  }, [selectedType]);

  const businessName = useMemo(() => {
    return businessProfileData?.name || currentUser.name;
  }, [businessProfileData, currentUser.name]);

  const businessAvatar = useMemo(() => {
    return businessProfileData?.avatar || currentUser.avatar;
  }, [businessProfileData, currentUser.avatar]);

  const allBizComMembers = useMemo(() => [...personalUsers], []);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return allBizComMembers;
    const q = searchQuery.toLowerCase();
    return allBizComMembers.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }, [allBizComMembers, searchQuery]);

  const filteredPhoneContacts = useMemo(() => {
    if (!searchQuery.trim()) return phoneContacts;
    const q = searchQuery.toLowerCase();
    return phoneContacts.filter(c => c.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const totalSelected = useMemo(() => selectedContacts.length + externalContacts.length, [selectedContacts, externalContacts]);

  const mockForwardFilteredContacts = useMemo(() => {
    if (!mockForwardSearch.trim()) return allBizComMembers;
    const q = mockForwardSearch.toLowerCase();
    return allBizComMembers.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }, [allBizComMembers, mockForwardSearch]);

  const mockForwardFilteredPhoneContacts = useMemo(() => {
    if (!mockForwardSearch.trim()) return phoneContacts;
    const q = mockForwardSearch.toLowerCase();
    return phoneContacts.filter(c => c.name.toLowerCase().includes(q));
  }, [mockForwardSearch]);

  const mockForwardTotal = useMemo(() => mockForwardContacts.length + mockForwardExternals.length, [mockForwardContacts, mockForwardExternals]);

  const handleToggleContact = useCallback((user: User) => {
    setSelectedContacts(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) return prev.filter(u => u.id !== user.id);
      return [...prev, user];
    });
  }, []);

  const handleToggleExternal = useCallback((contact: PhoneContact, method: 'sms' | 'email' | 'whatsapp' | 'facebook') => {
    setExternalContacts(prev => {
      const exists = prev.some(e => e.contact.id === contact.id);
      if (exists) return prev.filter(e => e.contact.id !== contact.id);
      return [...prev, { contact, method }];
    });
  }, []);

  const handleToggleMockForward = useCallback((user: User) => {
    setMockForwardContacts(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) return prev.filter(u => u.id !== user.id);
      return [...prev, user];
    });
  }, []);

  const handleToggleMockForwardExternal = useCallback((contact: PhoneContact, method: 'sms' | 'email' | 'whatsapp' | 'facebook') => {
    setMockForwardExternals(prev => {
      const exists = prev.some(e => e.contact.id === contact.id);
      if (exists) return prev.filter(e => e.contact.id !== contact.id);
      return [...prev, { contact, method }];
    });
  }, []);

  const handleSelectType = useCallback((type: ReferralRequestType) => {
    setSelectedType(type);
    setStep(2);
    console.log(`[REFERRAL] Selected type: ${type}`);
  }, []);

  const handleContinueToMessage = useCallback(() => {
    setStep(4);
  }, []);

  const handleContinueFromImages = useCallback(() => {
    setStep(3);
  }, []);

  const handleSendRequest = useCallback(() => {
    if (!selectedType) return;

    const referrerList = [
      ...selectedContacts.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        phone: u.phone ?? '',
      })),
      ...externalContacts.map(e => ({
        id: e.contact.id,
        name: e.contact.name,
        avatar: e.contact.avatar,
        phone: e.contact.phone,
      })),
    ];

    const requests = createReferralRequest(
      selectedType,
      currentUser.id,
      businessName,
      businessAvatar,
      referrerList,
      personalMessage,
      selectedType === 'goodwill' ? 0 : referralPoints,
      selectedType === 'goodwill' ? 0 : welcomePoints,
      selectedType === 'custom' ? customReferralImage : undefined,
      selectedType === 'custom' ? customNewMemberImage : undefined,
    );

    setSentRequestIds(requests.map(r => r.id));
    setStep(5);
    console.log(`[REFERRAL] Sent ${requests.length} ${selectedType} referral requests`);
  }, [selectedType, selectedContacts, externalContacts, personalMessage, createReferralRequest, currentUser.id, businessName, businessAvatar, customReferralImage, customNewMemberImage]);

  const handleShowMockFlow = useCallback(() => {
    setMockStep(1);
    setStep(6);
  }, []);

  const handleMockAccept = useCallback(() => {
    setMockStep(2);
    console.log('[REFERRAL MOCK] Referrer accepted the request');
  }, []);

  const handleMockDecline = useCallback(() => {
    setMockStep(10);
    console.log('[REFERRAL MOCK] Referrer declined the request');
  }, []);

  const handleMockForwardContinue = useCallback(() => {
    setMockStep(3);
  }, []);

  const handleMockForwardSend = useCallback(() => {
    setMockStep(4);
    console.log('[REFERRAL MOCK] Referrer forwarded request to referred parties');
  }, []);

  const handleMockReferredAccept = useCallback(() => {
    setMockStep(5);
    console.log('[REFERRAL MOCK] Referred party accepted the request');
  }, []);

  const handleMockReferredDecline = useCallback(() => {
    setMockStep(11);
    console.log('[REFERRAL MOCK] Referred party declined the request');
  }, []);

  const handleMockBusinessAccept = useCallback(() => {
    setMockStep(6);
    console.log('[REFERRAL MOCK] Business confirmed the referral');
  }, []);

  const handleMockBusinessDecline = useCallback(() => {
    setMockStep(12);
    console.log('[REFERRAL MOCK] Business declined the referred party');
  }, []);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  const renderTypeSelection = () => (
    <View style={s.typeContainer}>
      <Text style={s.typeHeading}>Select Referral Type</Text>
      <Text style={s.typeSubheading}>Choose how you want to request referrals from your BizCom members</Text>

      {REFERRAL_TYPES.map((type) => (
        <TouchableOpacity
          key={type.key}
          style={s.typeCard}
          activeOpacity={0.7}
          onPress={() => handleSelectType(type.key)}
        >
          <View style={[s.typeIconWrap, { backgroundColor: type.iconBg }]}>
            {type.icon}
          </View>
          <View style={s.typeCardContent}>
            <Text style={s.typeCardTitle}>{type.title}</Text>
            <Text style={s.typeCardDesc}>{type.description}</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContactPicker = () => (
    <View style={{ flex: 1 }}>
      <Text style={s.stepLabel}>Select BizCom Members</Text>
      <Text style={s.stepSub}>Choose contacts to send your {typeConfig.title}</Text>

      {totalSelected > 0 && (
        <View style={s.selectedBar}>
          <View style={s.selectedAvatars}>
            {selectedContacts.slice(0, 4).map((u, i) => (
              <Image key={u.id} source={{ uri: u.avatar }} style={[s.selectedMiniAvatar, i === 0 && { marginLeft: 0 }]} />
            ))}
            {externalContacts.slice(0, Math.max(0, 4 - selectedContacts.length)).map(e => (
              <Image key={e.contact.id} source={{ uri: e.contact.avatar }} style={s.selectedMiniAvatar} />
            ))}
            {totalSelected > 4 && (
              <View style={s.selectedMoreBadge}>
                <Text style={s.selectedMoreText}>+{totalSelected - 4}</Text>
              </View>
            )}
          </View>
          <Text style={s.selectedCount}>{totalSelected} selected</Text>
        </View>
      )}

      <View style={s.searchBar}>
        <Search size={17} color={Colors.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search members or contacts..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[
          ...filteredMembers.map(u => ({ type: 'member' as const, data: u })),
          ...filteredPhoneContacts.map(c => ({ type: 'external' as const, data: c })),
        ]}
        keyExtractor={(item) => item.type === 'member' ? item.data.id : `ext-${(item.data as PhoneContact).id}`}
        renderItem={({ item, index }) => {
          const showExternalHeader = item.type === 'external' && index === filteredMembers.length;

          if (item.type === 'member') {
            const user = item.data as User;
            const isSelected = selectedContacts.some(u => u.id === user.id);
            return (
              <TouchableOpacity
                style={[s.contactItem, isSelected && { backgroundColor: typeConfig.accentColor + '0A' }]}
                activeOpacity={0.7}
                onPress={() => handleToggleContact(user)}
              >
                <View style={s.contactAvatarWrap}>
                  <Image source={{ uri: user.avatar }} style={s.contactAvatar} />
                  {user.isOnline && <View style={s.contactOnline} />}
                </View>
                <View style={s.contactInfo}>
                  <Text style={s.contactName}>{user.name}</Text>
                  <Text style={s.contactSub}>@{user.username}</Text>
                </View>
                <View style={[s.checkCircle, isSelected && { backgroundColor: typeConfig.accentColor, borderColor: typeConfig.accentColor }]}>
                  {isSelected && <Check size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }

          const contact = item.data as PhoneContact;
          const isExtSelected = externalContacts.some(e => e.contact.id === contact.id);
          const extMethod = externalContacts.find(e => e.contact.id === contact.id)?.method;
          return (
            <View>
              {showExternalHeader && (
                <View style={s.sectionDivider}>
                  <View style={s.sectionLine} />
                  <Text style={s.sectionDividerLabel}>Phone Contacts</Text>
                  <View style={s.sectionLine} />
                </View>
              )}
              <View style={[s.contactItem, isExtSelected && { backgroundColor: typeConfig.accentColor + '0A' }]}>
                <View style={s.contactAvatarWrap}>
                  <Image source={{ uri: contact.avatar }} style={s.contactAvatar} />
                </View>
                <View style={s.contactInfo}>
                  <Text style={s.contactName}>{contact.name}</Text>
                  <Text style={s.contactSub}>{contact.phone}</Text>
                </View>
                {isExtSelected ? (
                  <TouchableOpacity
                    style={s.selectedMethodBadge}
                    onPress={() => handleToggleExternal(contact, extMethod ?? 'sms')}
                    activeOpacity={0.7}
                  >
                    <Check size={12} color="#22C55E" />
                    <Text style={s.selectedMethodText}>
                      {extMethod === 'sms' ? 'SMS' : extMethod === 'email' ? 'Email' : extMethod === 'whatsapp' ? 'WhatsApp' : 'Facebook'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.inviteBtns}>
                    <TouchableOpacity style={[s.inviteBtn, { backgroundColor: '#22C55E18' }]} onPress={() => handleToggleExternal(contact, 'sms')}>
                      <Smartphone size={14} color="#22C55E" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.inviteBtn, { backgroundColor: '#3B82F618' }]} onPress={() => handleToggleExternal(contact, 'email')}>
                      <AtSign size={14} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.inviteBtn, { backgroundColor: '#25D36618' }]} onPress={() => handleToggleExternal(contact, 'whatsapp')}>
                      <MessageSquare size={14} color="#25D366" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.inviteBtn, { backgroundColor: '#1877F218' }]} onPress={() => handleToggleExternal(contact, 'facebook')}>
                      <Globe size={14} color="#1877F2" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={s.contactList}
        showsVerticalScrollIndicator={false}
      />

      {totalSelected > 0 && (
        <TouchableOpacity
          style={[s.continueBtn, { backgroundColor: typeConfig.accentColor + '14' }]}
          activeOpacity={0.85}
          onPress={handleContinueToMessage}
        >
          <Text style={[s.continueBtnText, { color: typeConfig.accentColor }]}>Continue ({totalSelected})</Text>
          <ChevronRight size={18} color={typeConfig.accentColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCustomImageUpload = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.imageUploadContainer}>
      <Text style={s.stepLabel}>Upload Offer Images</Text>
      <Text style={s.stepSub}>Add images for the referral and new member offers</Text>

      <View style={s.imageUploadCard}>
        <Text style={s.imageUploadTitle}>Referral Offer</Text>
        <Text style={s.imageUploadDesc}>This image will be sent to the referrer</Text>
        <TouchableOpacity
          style={s.imageUploadArea}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert('Mock Upload', 'In production, this would open the image picker. Using mock image for demo.');
            setCustomReferralImage(MOCK_CUSTOM_IMAGES.referralOffer);
          }}
        >
          {customReferralImage ? (
            <Image source={{ uri: customReferralImage }} style={s.uploadedImage} contentFit="cover" />
          ) : (
            <View style={s.uploadPlaceholder}>
              <ImagePlus size={32} color={Colors.textTertiary} />
              <Text style={s.uploadPlaceholderText}>Tap to upload image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.imageUploadCard}>
        <Text style={s.imageUploadTitle}>New Member Offer</Text>
        <Text style={s.imageUploadDesc}>This image will be sent to the referred new member</Text>
        <TouchableOpacity
          style={s.imageUploadArea}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert('Mock Upload', 'In production, this would open the image picker. Using mock image for demo.');
            setCustomNewMemberImage(MOCK_CUSTOM_IMAGES.newMemberOffer);
          }}
        >
          {customNewMemberImage ? (
            <Image source={{ uri: customNewMemberImage }} style={s.uploadedImage} contentFit="cover" />
          ) : (
            <View style={s.uploadPlaceholder}>
              <ImagePlus size={32} color={Colors.textTertiary} />
              <Text style={s.uploadPlaceholderText}>Tap to upload image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.continueBtn, { backgroundColor: typeConfig.accentColor + '14', marginTop: 16 }]}
        activeOpacity={0.85}
        onPress={handleContinueFromImages}
      >
        <Text style={[s.continueBtnText, { color: typeConfig.accentColor }]}>Continue</Text>
        <ChevronRight size={18} color={typeConfig.accentColor} />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderMessagePreview = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.previewContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.recipientCard}>
        <Text style={s.recipientLabel}>
          Sending to ({totalSelected} contact{totalSelected !== 1 ? 's' : ''})
        </Text>
        <ScrollView style={s.recipientScroll} nestedScrollEnabled>
          {selectedContacts.map(user => (
            <View key={user.id} style={s.recipientChip}>
              <Image source={{ uri: user.avatar }} style={s.chipAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.chipName}>{user.name}</Text>
                <Text style={s.chipSub}>@{user.username}</Text>
              </View>
              <TouchableOpacity onPress={() => handleToggleContact(user)} hitSlop={8}>
                <X size={14} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
          {externalContacts.map(ext => (
            <View key={ext.contact.id} style={s.recipientChip}>
              <Image source={{ uri: ext.contact.avatar }} style={s.chipAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.chipName}>{ext.contact.name}</Text>
                <Text style={s.chipSub}>
                  via {ext.method === 'sms' ? 'SMS' : ext.method === 'email' ? 'Email' : ext.method === 'whatsapp' ? 'WhatsApp' : 'Facebook Messenger'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleToggleExternal(ext.contact, ext.method)} hitSlop={8}>
                <X size={14} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={s.msgCard}>
        <Text style={s.msgLabel}>Add a personal message (optional)</Text>
        <TextInput
          style={s.msgInput}
          placeholder={`e.g. Hi! ${businessName} would love your help spreading the word...`}
          placeholderTextColor={Colors.textTertiary}
          value={personalMessage}
          onChangeText={setPersonalMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {typeConfig.hasPoints && (
        <View style={[s.pointsCard, { borderLeftColor: typeConfig.accentColor }]}>
          <View style={s.pointsRow}>
            <Award size={18} color={typeConfig.accentColor} />
            <Text style={s.pointsTitle}>Reward Points Incentive</Text>
          </View>
          <View style={s.pointsDetails}>
            <View style={s.pointsItem}>
              <Text style={s.pointsValue}>{referralPoints}</Text>
              <Text style={s.pointsLabel}>pts for referrer</Text>
            </View>
            <View style={s.pointsDivider} />
            <View style={s.pointsItem}>
              <Text style={s.pointsValue}>{welcomePoints}</Text>
              <Text style={s.pointsLabel}>pts for new member</Text>
            </View>
          </View>
          <Text style={s.pointsNote}>Points are derived from your Business Rewards setup</Text>
        </View>
      )}

      {typeConfig.hasCustomImages && (
        <View style={s.customImagesPreview}>
          <Text style={s.customImagesLabel}>Attached Offer Images</Text>
          <View style={s.customImagesRow}>
            <View style={s.customImagePreviewWrap}>
              <Image source={{ uri: customReferralImage }} style={s.customImageThumb} contentFit="cover" />
              <Text style={s.customImageCaption}>Referral Offer</Text>
            </View>
            <View style={s.customImagePreviewWrap}>
              <Image source={{ uri: customNewMemberImage }} style={s.customImageThumb} contentFit="cover" />
              <Text style={s.customImageCaption}>New Member Offer</Text>
            </View>
          </View>
        </View>
      )}

      <View style={[s.infoCard, { backgroundColor: typeConfig.accentColor + '0D' }]}>
        {typeConfig.icon}
        <Text style={s.infoText}>
          {typeConfig.hasPoints
            ? `Each contact will receive a ${typeConfig.title} with ${referralPoints} points incentive. They can accept and forward to their network.`
            : typeConfig.hasCustomImages
              ? `Each contact will receive a ${typeConfig.title} with your custom offer images. They can accept and forward to their network.`
              : `Each contact will receive a ${typeConfig.title}. They can accept and forward to their network as a goodwill gesture.`
          }
        </Text>
      </View>

      <TouchableOpacity
        style={[s.sendBtn, { backgroundColor: typeConfig.accentColor }]}
        activeOpacity={0.8}
        onPress={handleSendRequest}
      >
        <Send size={18} color="#fff" />
        <Text style={s.sendBtnText}>Send {typeConfig.title}</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderSentConfirmation = () => (
    <View style={s.sentContainer}>
      <View style={s.sentIconWrap}>
        <CircleCheck size={56} color="#22C55E" />
      </View>
      <Text style={s.sentTitle}>{typeConfig.title} Sent!</Text>
      <Text style={s.sentSub}>
        Your request has been sent to{' '}
        <Text style={{ fontWeight: '700' as const }}>
          {totalSelected} contact{totalSelected !== 1 ? 's' : ''}
        </Text>
      </Text>
      <View style={s.sentAvatarRow}>
        {selectedContacts.slice(0, 5).map((u, i) => (
          <Image key={u.id} source={{ uri: u.avatar }} style={[s.sentAvatar, i === 0 && { marginLeft: 0 }]} />
        ))}
        {externalContacts.slice(0, Math.max(0, 5 - selectedContacts.length)).map(e => (
          <Image key={e.contact.id} source={{ uri: e.contact.avatar }} style={s.sentAvatar} />
        ))}
        {totalSelected > 5 && (
          <View style={s.sentMoreBadge}>
            <Text style={s.sentMoreText}>+{totalSelected - 5}</Text>
          </View>
        )}
      </View>

      {externalContacts.length > 0 && (
        <View style={s.externalNote}>
          <Smartphone size={14} color={Colors.textSecondary} />
          <Text style={s.externalNoteText}>
            Non-members will receive a request to download TouchPoint and join
          </Text>
        </View>
      )}

      <View style={s.sentDivider} />

      <Text style={s.mockLabel}>Mock: See Referral Flow Demo</Text>
      <TouchableOpacity
        style={[s.mockDemoBtn, { borderColor: typeConfig.accentColor + '40' }]}
        activeOpacity={0.8}
        onPress={handleShowMockFlow}
      >
        <View style={[s.mockDemoBtnIcon, { backgroundColor: typeConfig.iconBg }]}>
          {typeConfig.icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.mockDemoBtnTitle}>View Full Referral Flow</Text>
          <Text style={s.mockDemoBtnSub}>See how recipients interact with the request</Text>
        </View>
        <ChevronRight size={18} color={typeConfig.accentColor} />
      </TouchableOpacity>

      <TouchableOpacity style={s.doneBtn} activeOpacity={0.8} onPress={handleDone}>
        <Text style={s.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const mockReferrerName = selectedContacts[0]?.name ?? externalContacts[0]?.contact.name ?? 'Maya Chen';
  const mockReferrerAvatar = selectedContacts[0]?.avatar ?? externalContacts[0]?.contact.avatar ?? personalUsers[0].avatar;
  const mockReferredName = mockForwardContacts[0]?.name ?? mockForwardExternals[0]?.contact.name ?? 'Sofia Martinez';
  const mockReferredAvatar = mockForwardContacts[0]?.avatar ?? mockForwardExternals[0]?.contact.avatar ?? personalUsers[2].avatar;
  const isGoodwill = selectedType === 'goodwill';
  const headingLabel = isGoodwill ? 'Goodwill Referral Request' : selectedType === 'custom' ? 'Custom Referral Request' : 'Generic Referral Request';

  const renderMockFlow = () => {
    if (mockStep === 1) {
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.mockContainer}>
          <View style={s.mockViewLabel}>
            <Text style={s.mockViewLabelText}>Referrer&apos;s View ({mockReferrerName})</Text>
          </View>

          <View style={[s.mockMessageCard, { borderColor: typeConfig.accentColor + '30' }]}>
            <View style={s.mockMessageHeader}>
              <View style={[s.mockMessageIcon, { backgroundColor: typeConfig.iconBg }]}>
                {typeConfig.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mockMessageTitle}>{headingLabel}</Text>
                <Text style={s.mockMessageFrom}>From {businessName}</Text>
              </View>
            </View>

            <View style={s.mockMessageBody}>
              <View style={s.mockBusinessRow}>
                <Image source={{ uri: businessAvatar }} style={s.mockBusinessAvatar} />
                <Text style={s.mockBusinessName}>{businessName}</Text>
              </View>

              {personalMessage.length > 0 && (
                <View style={[s.mockMsgBubble, { borderLeftColor: typeConfig.accentColor }]}>
                  <Text style={s.mockMsgText}>{personalMessage}</Text>
                </View>
              )}

              {typeConfig.hasPoints && (
                <View style={[s.mockPointsBadge, { backgroundColor: typeConfig.accentColor + '10' }]}>
                  <Award size={16} color={typeConfig.accentColor} />
                  <Text style={[s.mockPointsText, { color: typeConfig.accentColor }]}>
                    Earn {referralPoints} points for each successful referral
                  </Text>
                </View>
              )}

              {selectedType === 'custom' && customReferralImage && (
                <View style={s.mockAttachmentWrap}>
                  <Image source={{ uri: customReferralImage }} style={s.mockAttachmentImage} contentFit="cover" />
                  <Text style={s.mockAttachmentLabel}>Referral Offer</Text>
                </View>
              )}
            </View>

            <View style={s.mockActionRow}>
              <TouchableOpacity
                style={[s.mockAcceptBtn, { backgroundColor: typeConfig.accentColor }]}
                activeOpacity={0.8}
                onPress={handleMockAccept}
              >
                <Check size={16} color="#fff" />
                <Text style={s.mockAcceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.mockDeclineBtn} activeOpacity={0.7} onPress={handleMockDecline}>
                <XCircle size={16} color="#EF4444" />
                <Text style={s.mockDeclineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (mockStep === 2) {
      return (
        <View style={{ flex: 1 }}>
          <View style={s.fwdSelectHeader}>
            <Forward size={16} color={typeConfig.accentColor} />
            <Text style={s.fwdSelectTitle}>Select contacts to forward</Text>
            {mockForwardTotal > 0 && (
              <View style={[s.fwdSelectBadge, { backgroundColor: typeConfig.accentColor }]}>
                <Text style={s.fwdSelectBadgeText}>{mockForwardTotal}</Text>
              </View>
            )}
          </View>

          <View style={s.searchBar}>
            <Search size={17} color={Colors.textTertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Search friends or contacts..."
              placeholderTextColor={Colors.textTertiary}
              value={mockForwardSearch}
              onChangeText={setMockForwardSearch}
            />
            {mockForwardSearch.length > 0 && (
              <TouchableOpacity onPress={() => setMockForwardSearch('')} hitSlop={8}>
                <X size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={[
              ...mockForwardFilteredContacts.map(u => ({ type: 'member' as const, data: u })),
              ...mockForwardFilteredPhoneContacts.map(c => ({ type: 'external' as const, data: c })),
            ]}
            keyExtractor={(item) => item.type === 'member' ? `fwd-${item.data.id}` : `fwd-ext-${(item.data as PhoneContact).id}`}
            renderItem={({ item, index }) => {
              const showHeader = item.type === 'external' && index === mockForwardFilteredContacts.length;
              if (item.type === 'member') {
                const user = item.data as User;
                const isSel = mockForwardContacts.some(u => u.id === user.id);
                return (
                  <TouchableOpacity
                    style={[s.fwdContactRow, isSel && { backgroundColor: typeConfig.accentColor + '08' }]}
                    activeOpacity={0.7}
                    onPress={() => handleToggleMockForward(user)}
                  >
                    <Image source={{ uri: user.avatar }} style={s.fwdContactAvatar} />
                    <View style={s.contactInfo}>
                      <Text style={s.fwdContactName}>{user.name}</Text>
                      <Text style={s.fwdContactSub}>@{user.username}</Text>
                    </View>
                    <View style={[s.fwdCheck, isSel && { backgroundColor: typeConfig.accentColor, borderColor: typeConfig.accentColor }]}>
                      {isSel && <Check size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }
              const contact = item.data as PhoneContact;
              const isExtSel = mockForwardExternals.some(e => e.contact.id === contact.id);
              return (
                <View>
                  {showHeader && (
                    <View style={s.sectionDivider}>
                      <View style={s.sectionLine} />
                      <Text style={s.sectionDividerLabel}>External Contacts</Text>
                      <View style={s.sectionLine} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={[s.fwdContactRow, isExtSel && { backgroundColor: typeConfig.accentColor + '08' }]}
                    activeOpacity={0.7}
                    onPress={() => isExtSel ? handleToggleMockForwardExternal(contact, 'sms') : handleToggleMockForwardExternal(contact, 'sms')}
                  >
                    <Image source={{ uri: contact.avatar }} style={s.fwdContactAvatar} />
                    <View style={s.contactInfo}>
                      <Text style={s.fwdContactName}>{contact.name}</Text>
                      <Text style={s.fwdContactSub}>{contact.phone}</Text>
                    </View>
                    {isExtSel ? (
                      <View style={[s.fwdCheck, { backgroundColor: typeConfig.accentColor, borderColor: typeConfig.accentColor }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    ) : (
                      <View style={s.fwdInviteMethods}>
                        <TouchableOpacity style={[s.fwdInviteBtn, { backgroundColor: '#22C55E18' }]} onPress={() => handleToggleMockForwardExternal(contact, 'sms')}>
                          <Smartphone size={12} color="#22C55E" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.fwdInviteBtn, { backgroundColor: '#3B82F618' }]} onPress={() => handleToggleMockForwardExternal(contact, 'email')}>
                          <AtSign size={12} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.fwdInviteBtn, { backgroundColor: '#25D36618' }]} onPress={() => handleToggleMockForwardExternal(contact, 'whatsapp')}>
                          <MessageSquare size={12} color="#25D366" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />

          {mockForwardTotal > 0 && (
            <View style={s.fwdBottomBar}>
              <TouchableOpacity
                style={[s.fwdContinueBtn, { backgroundColor: typeConfig.accentColor }]}
                activeOpacity={0.85}
                onPress={handleMockForwardContinue}
              >
                <Text style={s.fwdContinueBtnText}>Continue ({mockForwardTotal})</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (mockStep === 3) {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.fwdPageContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.fwdPageHeader}>
              <View style={[s.fwdPageIconRow, { backgroundColor: typeConfig.accentColor + '10' }]}>
                <Forward size={18} color={typeConfig.accentColor} />
                <Text style={[s.fwdPageTitle, { color: typeConfig.accentColor }]}>Forward Referral</Text>
              </View>
              <Text style={s.fwdPageSubtitle}>
                {businessName} → {mockForwardTotal} contact{mockForwardTotal !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={s.fwdPageSection}>
              <Text style={s.fwdPageLabel}>To</Text>
              <View style={s.fwdPageRecipients}>
                {mockForwardContacts.slice(0, 6).map((u) => (
                  <View key={u.id} style={s.fwdPageChip}>
                    <Image source={{ uri: u.avatar }} style={s.fwdPageChipAvatar} />
                    <Text style={s.fwdPageChipName} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
                  </View>
                ))}
                {mockForwardExternals.slice(0, Math.max(0, 6 - mockForwardContacts.length)).map((e) => (
                  <View key={e.contact.id} style={s.fwdPageChip}>
                    <Image source={{ uri: e.contact.avatar }} style={s.fwdPageChipAvatar} />
                    <Text style={s.fwdPageChipName} numberOfLines={1}>{e.contact.name.split(' ')[0]}</Text>
                  </View>
                ))}
                {mockForwardTotal > 6 && (
                  <View style={[s.fwdPageChip, { backgroundColor: Colors.navyDark + '0C' }]}>
                    <Text style={s.fwdPageChipMore}>+{mockForwardTotal - 6}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.fwdPageSection}>
              <Text style={s.fwdPageLabel}>Message (optional)</Text>
              <TextInput
                style={s.fwdPageMsgInput}
                placeholder="Add a personal note..."
                placeholderTextColor={Colors.textTertiary}
                value={mockForwardMessage}
                onChangeText={setMockForwardMessage}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {selectedType === 'custom' && customNewMemberImage && (
              <View style={s.fwdPageSection}>
                <Text style={s.fwdPageLabel}>Attached Offer</Text>
                <Image source={{ uri: customNewMemberImage }} style={s.fwdPageAttachImg} contentFit="cover" />
              </View>
            )}
          </ScrollView>

          <View style={s.fwdPageBtnBar}>
            <TouchableOpacity
              style={[s.fwdPageBtn, { backgroundColor: typeConfig.accentColor }]}
              activeOpacity={0.8}
              onPress={handleMockForwardSend}
              testID="forward-referral-button"
            >
              <Forward size={18} color="#fff" />
              <Text style={s.fwdPageBtnText}>Forward</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (mockStep === 4) {
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.mockContainer}>
          <View style={s.mockViewLabel}>
            <Text style={s.mockViewLabelText}>Referrer&apos;s Message Updated</Text>
          </View>
          <View style={[s.mockStatusCard, { backgroundColor: '#0EA5E910' }]}>
            <Forward size={20} color="#0EA5E9" />
            <Text style={[s.mockStatusText, { color: '#0EA5E9' }]}>Forwarded</Text>
          </View>

          <Text style={s.mockNotifLabel}>Notification sent to {businessName}:</Text>
          <View style={[s.mockNotifCard, { borderLeftColor: typeConfig.accentColor }]}>
            <Text style={s.mockNotifText}>{mockReferrerName} has forwarded your referral request to {mockForwardTotal} contact{mockForwardTotal !== 1 ? 's' : ''}</Text>
          </View>

          <View style={s.sentDivider} />

          <View style={s.mockViewLabel}>
            <Text style={s.mockViewLabelText}>Referred Party&apos;s View ({mockReferredName})</Text>
          </View>

          <View style={[s.mockMessageCard, { borderColor: typeConfig.accentColor + '30' }]}>
            <View style={s.mockMessageHeader}>
              <View style={[s.mockMessageIcon, { backgroundColor: typeConfig.iconBg }]}>
                {typeConfig.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mockMessageTitle}>{headingLabel}</Text>
                <Text style={s.mockMessageFrom}>From {mockReferrerName} via {businessName}</Text>
              </View>
            </View>

            <View style={s.mockMessageBody}>
              {mockForwardMessage.length > 0 && (
                <View style={[s.mockMsgBubble, { borderLeftColor: typeConfig.accentColor }]}>
                  <Text style={s.mockMsgText}>{mockForwardMessage}</Text>
                </View>
              )}

              {typeConfig.hasPoints && (
                <View style={[s.mockPointsBadge, { backgroundColor: typeConfig.accentColor + '10' }]}>
                  <Gift size={16} color={typeConfig.accentColor} />
                  <Text style={[s.mockPointsText, { color: typeConfig.accentColor }]}>
                    Earn {welcomePoints} points when you join {businessName}
                  </Text>
                </View>
              )}

              {selectedType === 'custom' && customNewMemberImage && (
                <View style={s.mockAttachmentWrap}>
                  <Image source={{ uri: customNewMemberImage }} style={s.mockAttachmentImage} contentFit="cover" />
                  <Text style={s.mockAttachmentLabel}>New Member Offer</Text>
                </View>
              )}
            </View>

            <View style={s.mockActionRow}>
              <TouchableOpacity
                style={[s.mockAcceptBtn, { backgroundColor: typeConfig.accentColor }]}
                activeOpacity={0.8}
                onPress={handleMockReferredAccept}
              >
                <Check size={16} color="#fff" />
                <Text style={s.mockAcceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.mockDeclineBtn} activeOpacity={0.7} onPress={handleMockReferredDecline}>
                <XCircle size={16} color="#EF4444" />
                <Text style={s.mockDeclineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (mockStep === 5) {
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.mockContainer}>
          <View style={s.mockViewLabel}>
            <Text style={s.mockViewLabelText}>Referrer&apos;s Message Updated</Text>
          </View>
          <View style={[s.mockStatusCard, { backgroundColor: '#10B98110' }]}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={[s.mockStatusText, { color: '#10B981' }]}>Referral Accepted</Text>
          </View>

          <Text style={s.mockNotifLabel}>Notification to referrer ({mockReferrerName}):</Text>
          <View style={[s.mockNotifCard, { borderLeftColor: '#10B981' }]}>
            <Text style={s.mockNotifText}>{mockReferredName} has accepted the referral request</Text>
          </View>

          <View style={s.sentDivider} />

          <View style={s.mockViewLabel}>
            <Text style={s.mockViewLabelText}>Business View: Join Request from {mockReferredName}</Text>
          </View>

          <View style={[s.mockMessageCard, { borderColor: '#10B98130' }]}>
            <View style={s.mockMessageHeader}>
              <View style={[s.mockMessageIcon, { backgroundColor: '#10B98114' }]}>
                <UserPlus size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mockMessageTitle}>BizCom Join Request</Text>
                <Text style={s.mockMessageFrom}>{mockReferredName} via referral from {mockReferrerName}</Text>
              </View>
            </View>

            <View style={s.mockActionRow}>
              <TouchableOpacity
                style={[s.mockAcceptBtn, { backgroundColor: '#10B981' }]}
                activeOpacity={0.8}
                onPress={handleMockBusinessAccept}
              >
                <Check size={16} color="#fff" />
                <Text style={s.mockAcceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.mockDeclineBtn} activeOpacity={0.7} onPress={handleMockBusinessDecline}>
                <XCircle size={16} color="#EF4444" />
                <Text style={s.mockDeclineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (mockStep === 6) {
      return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.mockContainer}>
          <View style={s.sentIconWrap}>
            <CircleCheck size={56} color="#10B981" />
          </View>
          <Text style={s.sentTitle}>Business Confirmed</Text>
          <Text style={[s.sentSub, { marginBottom: 20 }]}>
            {mockReferredName} has been added to {businessName}&apos;s BizCom community
          </Text>

          <Text style={s.mockNotifLabel}>Message to Referrer ({mockReferrerName}):</Text>
          <View style={[s.mockConfirmCard, { borderLeftColor: '#10B981' }]}>
            <View style={s.mockConfirmHeader}>
              <Building2 size={16} color="#10B981" />
              <Text style={s.mockConfirmTitle}>Business Confirmed</Text>
            </View>
            <Text style={s.mockConfirmText}>
              Thank you for your referral and for supporting our business
            </Text>
            {!isGoodwill && (
              <View style={[s.mockPointsAwarded, { backgroundColor: typeConfig.accentColor + '10' }]}>
                <Award size={18} color={typeConfig.accentColor} />
                <Text style={[s.mockPointsAwardedText, { color: typeConfig.accentColor }]}>+{referralPoints} points awarded</Text>
              </View>
            )}
          </View>

          <Text style={[s.mockNotifLabel, { marginTop: 16 }]}>Message to Referred Party ({mockReferredName}):</Text>
          <View style={[s.mockConfirmCard, { borderLeftColor: '#10B981' }]}>
            <View style={s.mockConfirmHeader}>
              <Building2 size={16} color="#10B981" />
              <Text style={s.mockConfirmTitle}>Business Confirmed</Text>
            </View>
            <Text style={s.mockConfirmText}>
              Thank you for joining our BizCom and supporting our business
            </Text>
            {!isGoodwill && (
              <View style={[s.mockPointsAwarded, { backgroundColor: typeConfig.accentColor + '10' }]}>
                <Gift size={18} color={typeConfig.accentColor} />
                <Text style={[s.mockPointsAwardedText, { color: typeConfig.accentColor }]}>+{welcomePoints} points awarded</Text>
              </View>
            )}
          </View>

          <View style={s.mockChainCard}>
            <Text style={s.mockChainTitle}>Referral Chain</Text>
            <View style={s.mockChainRow}>
              <View style={s.mockChainNode}>
                <Image source={{ uri: businessAvatar }} style={s.mockChainAvatar} />
                <Text style={s.mockChainName} numberOfLines={1}>{businessName.split(' ')[0]}</Text>
              </View>
              <ChevronRight size={14} color={Colors.textTertiary} />
              <View style={s.mockChainNode}>
                <Image source={{ uri: mockReferrerAvatar }} style={s.mockChainAvatar} />
                <Text style={s.mockChainName} numberOfLines={1}>{mockReferrerName.split(' ')[0]}</Text>
              </View>
              <ChevronRight size={14} color={Colors.textTertiary} />
              <View style={s.mockChainNode}>
                <Image source={{ uri: mockReferredAvatar }} style={s.mockChainAvatar} />
                <Text style={s.mockChainName} numberOfLines={1}>{mockReferredName.split(' ')[0]}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.doneBtn} activeOpacity={0.8} onPress={handleDone}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (mockStep === 10) {
      return (
        <View style={s.mockContainer}>
          <View style={s.sentIconWrap}>
            <XCircle size={56} color="#EF4444" />
          </View>
          <Text style={[s.sentTitle, { color: '#EF4444' }]}>Declined</Text>
          <Text style={s.sentSub}>The referrer declined the request</Text>
          <View style={[s.mockStatusCard, { backgroundColor: '#EF444410' }]}>
            <Text style={[s.mockStatusText, { color: '#EF4444' }]}>Declined</Text>
          </View>
          <Text style={[s.mockNotifLabel, { marginTop: 16 }]}>Notification sent to {businessName}</Text>
          <TouchableOpacity style={s.doneBtn} activeOpacity={0.8} onPress={handleDone}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mockStep === 11) {
      return (
        <View style={s.mockContainer}>
          <View style={s.sentIconWrap}>
            <XCircle size={56} color="#EF4444" />
          </View>
          <Text style={[s.sentTitle, { color: '#EF4444' }]}>Referred Party Declined</Text>
          <Text style={s.sentSub}>{mockReferredName} declined the referral</Text>
          <View style={[s.mockStatusCard, { backgroundColor: '#EF444410' }]}>
            <Text style={[s.mockStatusText, { color: '#EF4444' }]}>Declined</Text>
          </View>
          <Text style={[s.mockNotifLabel, { marginTop: 12 }]}>Notification sent to {mockReferrerName}</Text>
          <TouchableOpacity style={s.doneBtn} activeOpacity={0.8} onPress={handleDone}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mockStep === 12) {
      return (
        <View style={s.mockContainer}>
          <View style={s.sentIconWrap}>
            <XCircle size={56} color="#EF4444" />
          </View>
          <Text style={[s.sentTitle, { color: '#EF4444' }]}>Business Declined</Text>
          <Text style={s.sentSub}>{businessName} declined the join request</Text>
          <View style={[s.mockStatusCard, { backgroundColor: '#EF444410' }]}>
            <Text style={[s.mockStatusText, { color: '#EF4444' }]}>Business Declined</Text>
          </View>
          <Text style={[s.mockNotifLabel, { marginTop: 12 }]}>Notifications sent to {mockReferrerName} and {mockReferredName}</Text>
          <TouchableOpacity style={s.doneBtn} activeOpacity={0.8} onPress={handleDone}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const getStepIndicatorCount = () => {
    if (selectedType === 'custom') return 4;
    return 3;
  };

  const getActiveStepIndex = () => {
    if (step <= 1) return 0;
    if (step === 2) return 1;
    if (step === 3 && selectedType === 'custom') return 2;
    if (step === 4) return selectedType === 'custom' ? 3 : 2;
    return getStepIndicatorCount();
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 6 || step === 5) {
                handleDone();
              } else if (step > 1) {
                if (step === 4 && selectedType !== 'custom') setStep(2);
                else if (step === 4 && selectedType === 'custom') setStep(3);
                else if (step === 3 && selectedType === 'custom') setStep(2);
                else setStep(step - 1);
              } else {
                router.back();
              }
            }}
            hitSlop={12}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerTitleWrap}>
            {selectedType && (
              <View style={[s.headerTypeIcon, { backgroundColor: typeConfig.accentColor + '30' }]}>
                {typeConfig.icon}
              </View>
            )}
            <Text style={s.headerTitle}>
              {selectedType ? typeConfig.heading : 'Referral Request'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDone} hitSlop={12}>
            <X size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {step > 1 && step < 6 && (
          <View style={s.stepIndicator}>
            {Array.from({ length: getStepIndicatorCount() }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.stepDot,
                  getActiveStepIndex() > i && { backgroundColor: typeConfig.accentColor, flex: 1 },
                  getActiveStepIndex() === i && { backgroundColor: typeConfig.accentColor + '60', flex: 1 },
                ]}
              />
            ))}
          </View>
        )}
      </SafeAreaView>

      {step === 1 && renderTypeSelection()}
      {step === 2 && selectedType === 'custom' && renderCustomImageUpload()}
      {step === 2 && selectedType !== 'custom' && renderContactPicker()}
      {step === 3 && selectedType === 'custom' && renderContactPicker()}
      {step === 4 && renderMessagePreview()}
      {step === 5 && renderSentConfirmation()}
      {step === 6 && renderMockFlow()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.navyDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.navyDark,
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTypeIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: '#fff', letterSpacing: -0.3 },
  stepIndicator: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: Colors.navyDark },
  stepDot: { height: 3, flex: 0.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },

  typeContainer: { flex: 1, padding: 20 },
  typeHeading: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  typeSubheading: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  typeCardContent: { flex: 1, marginRight: 8 },
  typeCardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 3 },
  typeCardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  stepLabel: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, paddingHorizontal: 16, paddingTop: 16, marginBottom: 4 },
  stepSub: { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: 16, marginBottom: 12 },

  selectedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surfaceAlt },
  selectedAvatars: { flexDirection: 'row', alignItems: 'center' },
  selectedMiniAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff', marginLeft: -8 },
  selectedMoreBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.navyDark, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  selectedMoreText: { fontSize: 10, fontWeight: '700' as const, color: '#fff' },
  selectedCount: { fontSize: 13, fontWeight: '600' as const, color: Colors.navyDark },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },

  contactList: { paddingBottom: 80 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  contactAvatarWrap: { position: 'relative' as const },
  contactAvatar: { width: 44, height: 44, borderRadius: 22 },
  contactOnline: { position: 'absolute' as const, bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  contactSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  sectionDividerLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },

  selectedMethodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E14', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  selectedMethodText: { fontSize: 11, fontWeight: '600' as const, color: '#22C55E' },
  inviteBtns: { flexDirection: 'row', gap: 6 },
  inviteBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 14, gap: 6 },
  continueBtnText: { fontSize: 16, fontWeight: '700' as const },

  imageUploadContainer: { padding: 20, paddingBottom: 40 },
  imageUploadCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  imageUploadTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  imageUploadDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  imageUploadArea: { height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.borderLight, borderStyle: 'dashed' as const },
  uploadedImage: { width: '100%', height: '100%' },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadPlaceholderText: { fontSize: 13, color: Colors.textTertiary },

  previewContainer: { padding: 20, paddingBottom: 40 },
  recipientCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 14 },
  recipientLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 10 },
  recipientScroll: { maxHeight: 180 },
  recipientChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  chipAvatar: { width: 36, height: 36, borderRadius: 18 },
  chipName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  chipSub: { fontSize: 12, color: Colors.textTertiary },

  msgCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 14 },
  msgLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 8 },
  msgInput: { fontSize: 14, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 10, padding: 12, textAlignVertical: 'top' as const },

  pointsCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 4 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pointsTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  pointsDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  pointsItem: { alignItems: 'center' },
  pointsValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.navyDark },
  pointsLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  pointsDivider: { width: 1, height: 30, backgroundColor: Colors.borderLight },
  pointsNote: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center' as const },

  customImagesPreview: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 14 },
  customImagesLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 10 },
  customImagesRow: { flexDirection: 'row', gap: 10 },
  customImagePreviewWrap: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  customImageThumb: { width: '100%', height: 100, borderRadius: 10 },
  customImageCaption: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary, textAlign: 'center' as const, marginTop: 6 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14, gap: 8 },
  sendBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },

  sentContainer: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 40 },
  sentIconWrap: { marginBottom: 16, alignItems: 'center' },
  sentTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginBottom: 8 },
  sentSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, marginBottom: 16 },
  sentAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sentAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#fff', marginLeft: -10 },
  sentMoreBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.navyDark, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  sentMoreText: { fontSize: 12, fontWeight: '700' as const, color: '#fff' },
  externalNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F9FF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16 },
  externalNoteText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  sentDivider: { width: '100%', height: 1, backgroundColor: Colors.borderLight, marginVertical: 20 },

  mockLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 10, alignSelf: 'flex-start' as const },
  mockDemoBtn: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 16 },
  mockDemoBtnIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mockDemoBtnTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  mockDemoBtnSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  doneBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.navyDark, alignItems: 'center', marginTop: 8 },
  doneBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },

  mockContainer: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  mockViewLabel: { width: '100%', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.navyDark + '0A', borderRadius: 8, marginBottom: 12, alignSelf: 'flex-start' as const },
  mockViewLabelText: { fontSize: 12, fontWeight: '700' as const, color: Colors.navyDark, letterSpacing: 0.3 },

  mockMessageCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  mockMessageHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight },
  mockMessageIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mockMessageTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  mockMessageFrom: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  mockMessageBody: { padding: 14, gap: 10 },
  mockBusinessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mockBusinessAvatar: { width: 32, height: 32, borderRadius: 16 },
  mockBusinessName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  mockMsgBubble: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 6 },
  mockMsgText: { fontSize: 14, color: Colors.text, lineHeight: 20, fontStyle: 'italic' as const },
  mockPointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  mockPointsText: { fontSize: 13, fontWeight: '600' as const },
  mockAttachmentWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  mockAttachmentImage: { width: '100%', height: 140 },
  mockAttachmentImageLarge: { width: '100%', height: 200, borderRadius: 12 },
  mockAttachmentLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary, padding: 8, textAlign: 'center' as const },
  mockActionRow: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 0.5, borderTopColor: Colors.borderLight },
  mockAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  mockAcceptBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#fff' },
  mockDeclineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#EF444410', gap: 6 },
  mockDeclineBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#EF4444' },

  mockStatusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 12, borderRadius: 10, gap: 8, marginBottom: 16 },
  mockStatusText: { fontSize: 16, fontWeight: '700' as const },

  mockNotifLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, alignSelf: 'flex-start' as const, marginBottom: 6 },
  mockNotifCard: { width: '100%', borderLeftWidth: 3, backgroundColor: Colors.surface, padding: 14, borderRadius: 10, marginBottom: 12 },
  mockNotifText: { fontSize: 14, color: Colors.text, lineHeight: 20 },

  mockConfirmCard: { width: '100%', borderLeftWidth: 4, backgroundColor: Colors.surface, padding: 14, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  mockConfirmHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mockConfirmTitle: { fontSize: 15, fontWeight: '700' as const, color: '#10B981' },
  mockConfirmText: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 10 },
  mockPointsAwarded: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  mockPointsAwardedText: { fontSize: 14, fontWeight: '700' as const },

  mockChainCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 16 },
  mockChainTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 12, textAlign: 'center' as const },
  mockChainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mockChainNode: { alignItems: 'center', gap: 4 },
  mockChainAvatar: { width: 40, height: 40, borderRadius: 20 },
  mockChainName: { fontSize: 11, fontWeight: '600' as const, color: Colors.text, maxWidth: 70, textAlign: 'center' as const },

  fwdSelectHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  fwdSelectTitle: { flex: 1, fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  fwdSelectBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const },
  fwdSelectBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#fff' },
  fwdContactRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  fwdContactAvatar: { width: 38, height: 38, borderRadius: 19 },
  fwdContactName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  fwdContactSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  fwdCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.borderLight, alignItems: 'center' as const, justifyContent: 'center' as const },
  fwdInviteMethods: { flexDirection: 'row' as const, gap: 5 },
  fwdInviteBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const },
  fwdBottomBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.background },
  fwdContinueBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 12, gap: 6 },
  fwdContinueBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },

  fwdPageContainer: { padding: 16, paddingBottom: 20 },
  fwdPageHeader: { marginBottom: 14 },
  fwdPageIconRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, alignSelf: 'flex-start' as const, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 4 },
  fwdPageTitle: { fontSize: 15, fontWeight: '700' as const },
  fwdPageSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, paddingLeft: 2 },
  fwdPageSection: { marginBottom: 12 },
  fwdPageLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6, paddingLeft: 2 },
  fwdPageRecipients: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  fwdPageChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  fwdPageChipAvatar: { width: 20, height: 20, borderRadius: 10 },
  fwdPageChipName: { fontSize: 12, fontWeight: '600' as const, color: Colors.text, maxWidth: 80 },
  fwdPageChipMore: { fontSize: 11, fontWeight: '700' as const, color: Colors.navyDark, paddingHorizontal: 4 },
  fwdPageMsgInput: { fontSize: 14, color: Colors.text, minHeight: 56, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 10, padding: 10, textAlignVertical: 'top' as const, backgroundColor: Colors.surface },
  fwdPageAttachImg: { width: '100%', height: 120, borderRadius: 10 },
  fwdPageBtnBar: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.background },
  fwdPageBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 12, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  fwdPageBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
});

