import React, { useState, useRef, useCallback, useMemo } from 'react';
import MarketplaceChatScreen from '@/components/MarketplaceChatScreen';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Phone, Video, Building2, ImagePlus, Film, Play, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { conversations, chatMessages, businessConversations, businessChatMessages } from '@/mocks/data';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accountType, businessProfileData, currentUser } = useAuth();

  const isMarketplaceChat = useMemo(() => (id ?? '').startsWith('mkt-'), [id]);

  if (isMarketplaceChat) {
    return <MarketplaceChatScreen chatId={id!} />;
  }

  const isBizMode = accountType === 'business';

  const conv = useMemo(() => {
    if (isBizMode) {
      const bizConv = businessConversations.find(c => c.id === id);
      if (bizConv) return bizConv;
    }
    return conversations.find(c => c.id === id);
  }, [id, isBizMode]);

  const businessAvatar = useMemo(() => {
    if (!isBizMode) return null;
    const logo = businessProfileData?.businessLogo;
    const photo = businessProfileData?.businessPhoto;
    const defaultAvatar = businessProfileData?.avatar || currentUser.avatar;
    return logo || photo || defaultAvatar;
  }, [isBizMode, businessProfileData, currentUser.avatar]);

  const businessName = useMemo(() => {
    if (!isBizMode) return '';
    return businessProfileData?.name || currentUser.name;
  }, [isBizMode, businessProfileData, currentUser.name]);

  const isBizConv = useMemo(() => {
    if (!isBizMode) return false;
    return businessConversations.some(c => c.id === id);
  }, [isBizMode, id]);

  const mySenderId = isBizConv ? 'b1' : currentUser.id;

  const initialMessages = useMemo(() => {
    if (isBizConv && businessChatMessages[id ?? '']) {
      return businessChatMessages[id ?? ''];
    }
    return chatMessages[id ?? ''] || [];
  }, [id, isBizConv]);

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: `m_${Date.now()}`,
      senderId: mySenderId,
      text: inputText.trim(),
      timestamp: 'Just now',
      read: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    console.log(`[CHAT] Sent as ${isBizConv ? businessName : 'personal'}: ${inputText.trim()}`);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, mySenderId, isBizConv, businessName]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log(`[CHAT] Image selected: ${uri}`);
        const newMsg: Message = {
          id: `m_${Date.now()}`,
          senderId: mySenderId,
          text: '📷 Photo',
          timestamp: 'Just now',
          read: false,
        };
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.log('[CHAT] Image picker error:', err);
    }
  }, [mySenderId]);

  const handlePickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log(`[CHAT] Video selected: ${uri}`);
        const newMsg: Message = {
          id: `m_${Date.now()}`,
          senderId: mySenderId,
          text: '🎥 Video',
          timestamp: 'Just now',
          read: false,
        };
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.log('[CHAT] Video picker error:', err);
    }
  }, [mySenderId]);

  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  const renderVideoPresentation = useCallback((item: Message, isMe: boolean) => {
    const vp = item.videoPresentation;
    if (!vp) return null;
    const isExpanded = expandedVideo === item.id;
    const activeSlide = vp.slides[activeSlideIndex];

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.videoBubble, isMe ? styles.videoBubbleMe : styles.videoBubbleOther]}>
          {!isExpanded ? (
            <Pressable
              style={styles.videoPreviewContainer}
              onPress={() => {
                setExpandedVideo(item.id);
                setActiveSlideIndex(0);
                console.log('[CHAT] Expanding video presentation:', vp.title);
              }}
            >
              <Image
                source={{ uri: vp.thumbnail }}
                style={styles.videoThumbnail}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.videoOverlay}
              />
              <View style={styles.videoPlayOverlay}>
                <View style={styles.videoPlayCircle}>
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </View>
              <View style={styles.videoInfoBar}>
                <View style={styles.videoInfoLeft}>
                  <Text style={styles.videoTitle}>{vp.title}</Text>
                  <Text style={styles.videoMeta}>{vp.slides.length} slides · {vp.duration}</Text>
                </View>
                <View style={styles.videoBadge}>
                  <Film size={12} color="#F59E0B" />
                  <Text style={styles.videoBadgeText}>Video</Text>
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={styles.videoExpandedContainer}>
              <View style={styles.videoSlideWrap}>
                <Image
                  source={{ uri: activeSlide.backgroundImage }}
                  style={styles.videoSlideImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.videoSlideContent}>
                  <View style={[styles.videoSlideAccent, { backgroundColor: activeSlide.accentColor }]} />
                  <Text style={styles.videoSlideTitle}>{activeSlide.title}</Text>
                  <Text style={styles.videoSlideSubtitle}>{activeSlide.subtitle}</Text>
                </View>
                <View style={styles.videoSlideCounter}>
                  <Text style={styles.videoSlideCounterText}>
                    {activeSlideIndex + 1}/{vp.slides.length}
                  </Text>
                </View>
              </View>
              <View style={styles.videoSlideNav}>
                <Pressable
                  style={[styles.videoNavBtn, activeSlideIndex === 0 && styles.videoNavBtnDisabled]}
                  onPress={() => {
                    if (activeSlideIndex > 0) setActiveSlideIndex(prev => prev - 1);
                  }}
                  disabled={activeSlideIndex === 0}
                >
                  <Text style={[styles.videoNavBtnText, activeSlideIndex === 0 && styles.videoNavBtnTextDisabled]}>Prev</Text>
                </Pressable>
                <View style={styles.videoDotsRow}>
                  {vp.slides.map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setActiveSlideIndex(i)}
                      style={[
                        styles.videoDot,
                        i === activeSlideIndex && { backgroundColor: activeSlide.accentColor },
                      ]}
                    />
                  ))}
                </View>
                {activeSlideIndex < vp.slides.length - 1 ? (
                  <Pressable
                    style={styles.videoNavBtn}
                    onPress={() => setActiveSlideIndex(prev => prev + 1)}
                  >
                    <Text style={styles.videoNavBtnText}>Next</Text>
                    <ChevronRight size={14} color={Colors.accent} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.videoNavBtn}
                    onPress={() => {
                      setExpandedVideo(null);
                      setActiveSlideIndex(0);
                    }}
                  >
                    <Text style={styles.videoNavBtnText}>Close</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe, { marginTop: 6, paddingHorizontal: 4 }]}>{item.timestamp}</Text>
        </View>
      </View>
    );
  }, [expandedVideo, activeSlideIndex]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.senderId === mySenderId;

    if (item.type === 'video_presentation' && item.videoPresentation) {
      return renderVideoPresentation(item, isMe);
    }

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {isMe && isBizConv && (
          <View style={styles.bizMsgAvatarWrap}>
            <Image source={{ uri: businessAvatar ?? '' }} style={styles.bizMsgAvatar} />
            <View style={styles.bizMsgBadge}>
              <Building2 size={6} color="#fff" />
            </View>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          {isMe && isBizConv && (
            <Text style={styles.bizMsgSenderLabel}>{businessName}</Text>
          )}
          <Text
            style={[
              styles.msgText,
              isMe && styles.msgTextMe,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.msgTime,
              isMe && styles.msgTimeMe,
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  }, [mySenderId, isBizConv, businessAvatar, businessName, renderVideoPresentation]);

  if (!conv) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Conversation not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={24} color={Colors.bannerText} />
          </TouchableOpacity>
          <Image source={{ uri: conv.participant.avatar }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{conv.participant.name}</Text>
            <Text style={styles.headerStatus}>
              {conv.participant.isOnline ? 'Online' : 'Last seen recently'}
            </Text>
          </View>
          {isBizConv && (
            <View style={styles.headerBizTag}>
              <Image source={{ uri: businessAvatar ?? '' }} style={styles.headerBizMiniAvatar} />
              <Building2 size={10} color="#0EA5E9" />
            </View>
          )}
          <TouchableOpacity hitSlop={12} style={styles.headerAction}>
            <Phone size={20} color={'rgba(255,215,0,0.7)'} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={12} style={styles.headerAction}>
            <Video size={20} color={'rgba(255,215,0,0.7)'} />
          </TouchableOpacity>
        </View>
        {isBizConv && (
          <View style={styles.bizChatBanner}>
            <Building2 size={12} color="#0EA5E9" />
            <Text style={styles.bizChatBannerText}>Messaging as <Text style={styles.bizChatBannerBold}>{businessName}</Text></Text>
          </View>
        )}
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
          {isBizConv && (
            <View style={styles.inputBizIndicator}>
              <Image source={{ uri: businessAvatar ?? '' }} style={styles.inputBizAvatar} />
              <Text style={styles.inputBizText}>Replying as {businessName}</Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <View style={styles.attachRow}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickImage}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <ImagePlus size={22} color={'#1A5C35'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickVideo}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <Film size={22} color={'#00B246'} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isBizConv ? `Reply as ${businessName}...` : 'Type a message...'}
              placeholderTextColor={Colors.textTertiary}
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Send size={20} color={Colors.navyDark} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerSafe: {
    backgroundColor: Colors.banner,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: 0,
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,215,0,0.6)',
    letterSpacing: 0.1,
  },
  headerAction: {
    padding: 6,
  },
  headerBizTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14,165,233,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBizMiniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.3)',
  },
  bizChatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,165,233,0.15)',
  },
  bizChatBannerText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  bizChatBannerBold: {
    fontWeight: '700' as const,
    color: '#0EA5E9',
  },
  msgList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  bizMsgAvatarWrap: {
    position: 'relative',
    marginRight: 6,
    marginBottom: 2,
  },
  bizMsgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  bizMsgBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  bizMsgSenderLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#0EA5E9',
    marginBottom: 3,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: Colors.navyDark,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  msgTextMe: {
    color: Colors.bannerText,
  },
  msgTime: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#999999',
    marginTop: 4,
    alignSelf: 'flex-end',
    letterSpacing: 0.2,
  },
  msgTimeMe: {
    color: 'rgba(255,215,0,0.5)',
  },
  inputSafe: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  inputBizIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  inputBizAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  inputBizText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#0EA5E9',
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: Colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8F5EE',
  },
  videoBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoBubbleMe: {
    backgroundColor: Colors.navyDark,
    borderBottomRightRadius: 4,
  },
  videoBubbleOther: {
    backgroundColor: Colors.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  videoPreviewContainer: {
    width: 260,
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  videoPlayOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  videoPlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245,158,11,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  videoInfoBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  videoInfoLeft: {
    flex: 1,
    marginRight: 8,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  videoMeta: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  videoExpandedContainer: {
    width: 280,
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoSlideWrap: {
    width: '100%',
    height: 200,
    position: 'relative' as const,
  },
  videoSlideImage: {
    width: '100%',
    height: '100%',
  },
  videoSlideContent: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  videoSlideAccent: {
    width: 32,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  videoSlideTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  videoSlideSubtitle: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 15,
    marginTop: 4,
  },
  videoSlideCounter: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  videoSlideCounterText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  videoSlideNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  videoNavBtnDisabled: {
    opacity: 0.3,
  },
  videoNavBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  videoNavBtnTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  videoDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
