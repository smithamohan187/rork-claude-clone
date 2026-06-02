import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Building2,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Copy,
  Link2,
  Send,
  CheckCircle2,
  ChevronRight,
  Users,
  Gift,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessInvitations } from '@/contexts/BusinessInvitationContext';
import * as Haptics from 'expo-haptics';

const _SCREEN_WIDTH = Dimensions.get('window').width;

type InviteStep = 'details' | 'method' | 'preview';

interface SendMethod {
  id: 'sms' | 'email' | 'whatsapp' | 'share_link' | 'copy_link';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export default function InviteBusinessScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { createBusinessInvitation, invitations } = useBusinessInvitations();

  const [step, setStep] = useState<InviteStep>('details');
  const [businessName, setBusinessName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [businessEmail, setBusinessEmail] = useState<string>('');
  const [businessPhone, setBusinessPhone] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<SendMethod['id'] | null>(null);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [lastInvitation, setLastInvitation] = useState<{ code: string; businessName: string } | null>(null);

  const successAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  const sendMethods: SendMethod[] = useMemo(() => [
    {
      id: 'sms',
      label: 'Text Message (SMS)',
      description: 'Send a quick SMS invitation',
      icon: <MessageSquare size={22} color="#10B981" />,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 'email',
      label: 'Email',
      description: 'Send a professional email invite',
      icon: <Mail size={22} color="#3B82F6" />,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      description: 'Share via WhatsApp message',
      icon: <Phone size={22} color="#25D366" />,
      color: '#25D366',
      bgColor: '#F0FFF4',
    },
    {
      id: 'share_link',
      label: 'Share Invite Link',
      description: 'Share a unique invite link via any app',
      icon: <Share2 size={22} color="#00B246" />,
      color: '#00B246',
      bgColor: '#E8F5EE',
    },
    {
      id: 'copy_link',
      label: 'Copy Invite Link',
      description: 'Copy the link to your clipboard',
      icon: <Copy size={22} color="#F59E0B" />,
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
  ], []);

  const defaultMessage = useMemo(() =>
    `Hi${contactName ? ` ${contactName}` : ''},\n\nI'd like to invite ${businessName || 'your business'} to join TouchPoint — a local business community app where you can connect with customers, run promotions, manage rewards programs, and grow your business.\n\nAs a TouchPoint business member, you'll get:\n• A dedicated business profile & listing\n• Customer loyalty & rewards tools\n• Promotion & ad management\n• BizCom community membership\n• Direct messaging with customers\n\nJoin through my personal invite link below and we'll be connected automatically within the app!\n\nLooking forward to seeing ${businessName || 'you'} on TouchPoint!`
  , [businessName, contactName]);

  const finalMessage = customMessage || defaultMessage;

  const canProceedDetails = businessName.trim().length > 0 && contactName.trim().length > 0;
  const canProceedMethod = selectedMethod !== null;

  const handleGoToMethod = useCallback(() => {
    if (!canProceedDetails) return;
    setStep('method');
    console.log('[InviteBusiness] Moving to method step for:', businessName);
  }, [canProceedDetails, businessName]);

  const handleGoToPreview = useCallback(() => {
    if (!canProceedMethod) return;
    setStep('preview');
    console.log('[InviteBusiness] Moving to preview step, method:', selectedMethod);
  }, [canProceedMethod, selectedMethod]);

  const handleBack = useCallback(() => {
    if (step === 'preview') setStep('method');
    else if (step === 'method') setStep('details');
    else router.back();
  }, [step, router]);

  const handleSend = useCallback(() => {
    if (!selectedMethod) return;

    const invitation = createBusinessInvitation({
      inviterId: currentUser.id,
      inviterName: currentUser.name,
      inviterAvatar: currentUser.avatar,
      businessName: businessName.trim(),
      businessEmail: businessEmail.trim(),
      businessPhone: businessPhone.trim(),
      contactName: contactName.trim(),
      method: selectedMethod,
      message: finalMessage,
    });

    setLastInvitation({ code: invitation.inviteLinkCode, businessName: invitation.businessName });

    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    successAnim.setValue(0);
    checkAnim.setValue(0);
    setShowSuccessModal(true);

    Animated.sequence([
      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
      Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 10 }),
    ]).start();

    console.log('[InviteBusiness] Invitation sent:', invitation.inviteLinkCode);
  }, [selectedMethod, createBusinessInvitation, currentUser, businessName, businessEmail, businessPhone, contactName, finalMessage, successAnim, checkAnim]);

  const handleDismissSuccess = useCallback(() => {
    setShowSuccessModal(false);
    setBusinessName('');
    setContactName('');
    setBusinessEmail('');
    setBusinessPhone('');
    setSelectedMethod(null);
    setCustomMessage('');
    setStep('details');
  }, []);

  const handleSendAnother = useCallback(() => {
    setShowSuccessModal(false);
    setBusinessName('');
    setContactName('');
    setBusinessEmail('');
    setBusinessPhone('');
    setSelectedMethod(null);
    setCustomMessage('');
    setStep('details');
  }, []);

  const recentInvites = useMemo(() => invitations.slice(0, 3), [invitations]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {step === 'details' ? 'Invite a Business' : step === 'method' ? 'Send Method' : 'Review & Send'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {step === 'details' ? 'Grow the TouchPoint community' : step === 'method' ? 'Choose how to send' : 'Confirm your invitation'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {(step === 'method' || step === 'preview') && (
          <View style={styles.stepIndicator}>
            <View style={styles.stepDot}>
              <View style={[styles.stepDotInner, styles.stepDotCompleted]} />
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepDot}>
              <View style={[styles.stepDotInner, step === 'method' ? styles.stepDotActive : styles.stepDotCompleted]} />
            </View>
            <View style={[styles.stepLine, step !== 'preview' && styles.stepLineInactive]} />
            <View style={styles.stepDot}>
              <View style={[styles.stepDotInner, step === 'preview' ? styles.stepDotActive : styles.stepDotInactive]} />
            </View>
          </View>
        )}
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 'details' && (
          <View style={styles.stepContent}>
            <View style={styles.introBanner}>
              <LinearGradient
                colors={['#0D9488', '#0F766E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.introBannerGradient}
              >
                <View style={styles.introBannerIcon}>
                  <Building2 size={28} color="#fff" />
                </View>
                <Text style={styles.introBannerTitle}>Invite a Local Business</Text>
                <Text style={styles.introBannerText}>
                  Know a business that would benefit from TouchPoint? Invite them to join and you'll both be automatically connected within the app when they sign up.
                </Text>
                <View style={styles.introBenefits}>
                  <View style={styles.benefitRow}>
                    <View style={styles.benefitDot} />
                    <Text style={styles.benefitText}>Earn 100 reward points when they join</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <View style={styles.benefitDot} />
                    <Text style={styles.benefitText}>Automatically linked via unique invite code</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <View style={styles.benefitDot} />
                    <Text style={styles.benefitText}>Help grow your local business community</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Business Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name *</Text>
                <View style={styles.inputWrap}>
                  <Building2 size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Joe's Coffee Shop"
                    placeholderTextColor={Colors.textTertiary}
                    value={businessName}
                    onChangeText={setBusinessName}
                    autoCapitalize="words"
                    testID="business-name-input"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Person Name *</Text>
                <View style={styles.inputWrap}>
                  <Users size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Joe Smith"
                    placeholderTextColor={Colors.textTertiary}
                    value={contactName}
                    onChangeText={setContactName}
                    autoCapitalize="words"
                    testID="contact-name-input"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Email</Text>
                <View style={styles.inputWrap}>
                  <Mail size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. hello@joescoffee.com"
                    placeholderTextColor={Colors.textTertiary}
                    value={businessEmail}
                    onChangeText={setBusinessEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="business-email-input"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Phone</Text>
                <View style={styles.inputWrap}>
                  <Phone size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. +353 1 234 5678"
                    placeholderTextColor={Colors.textTertiary}
                    value={businessPhone}
                    onChangeText={setBusinessPhone}
                    keyboardType="phone-pad"
                    testID="business-phone-input"
                  />
                </View>
              </View>
            </View>

            <View style={styles.howItWorksSection}>
              <Text style={styles.howItWorksTitle}>How the Link Works</Text>
              <View style={styles.flowSteps}>
                <View style={styles.flowStep}>
                  <View style={[styles.flowStepNumber, { backgroundColor: '#0D9488' }]}>
                    <Text style={styles.flowStepNumberText}>1</Text>
                  </View>
                  <View style={styles.flowStepContent}>
                    <Text style={styles.flowStepTitle}>You send the invite</Text>
                    <Text style={styles.flowStepDesc}>A unique link code is generated and sent to the business</Text>
                  </View>
                </View>
                <View style={styles.flowConnector} />
                <View style={styles.flowStep}>
                  <View style={[styles.flowStepNumber, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.flowStepNumberText}>2</Text>
                  </View>
                  <View style={styles.flowStepContent}>
                    <Text style={styles.flowStepTitle}>Business downloads the app</Text>
                    <Text style={styles.flowStepDesc}>They use your unique invite code when signing up</Text>
                  </View>
                </View>
                <View style={styles.flowConnector} />
                <View style={styles.flowStep}>
                  <View style={[styles.flowStepNumber, { backgroundColor: '#00B246' }]}>
                    <Text style={styles.flowStepNumberText}>3</Text>
                  </View>
                  <View style={styles.flowStepContent}>
                    <Text style={styles.flowStepTitle}>Automatic connection</Text>
                    <Text style={styles.flowStepDesc}>You and the business are linked within the app — follow, message, earn rewards</Text>
                  </View>
                </View>
                <View style={styles.flowConnector} />
                <View style={styles.flowStep}>
                  <View style={[styles.flowStepNumber, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.flowStepNumberText}>4</Text>
                  </View>
                  <View style={styles.flowStepContent}>
                    <Text style={styles.flowStepTitle}>Earn rewards</Text>
                    <Text style={styles.flowStepDesc}>When a business accepts your request to join and makes a paid subscription you will receive 500 TouchPoint pending the trial period</Text>
                  </View>
                </View>
              </View>
            </View>

            {recentInvites.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent Invitations</Text>
                {recentInvites.map((inv) => (
                  <View key={inv.id} style={styles.recentRow}>
                    <View style={[styles.recentIcon, { backgroundColor: inv.status === 'linked' ? '#ECFDF5' : '#FEF3C7' }]}>
                      {inv.status === 'linked' ? (
                        <CheckCircle2 size={16} color="#10B981" />
                      ) : (
                        <Send size={16} color="#F59E0B" />
                      )}
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={styles.recentName} numberOfLines={1}>{inv.businessName}</Text>
                      <Text style={styles.recentStatus}>
                        {inv.status === 'linked' ? 'Joined & Linked' : inv.status === 'clicked' ? 'Link clicked' : 'Invitation sent'}
                      </Text>
                    </View>
                    <Text style={styles.recentCode}>{inv.inviteLinkCode}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 120 }} />
          </View>
        )}

        {step === 'method' && (
          <View style={styles.stepContent}>
            <View style={styles.methodHeader}>
              <View style={styles.methodSummary}>
                <Building2 size={18} color={Colors.navyDark} />
                <View style={styles.methodSummaryText}>
                  <Text style={styles.methodSummaryTitle}>{businessName}</Text>
                  <Text style={styles.methodSummarySubtitle}>Contact: {contactName}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.methodSectionTitle}>Choose how to send your invitation</Text>

            {sendMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedMethod(method.id);
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <View style={[styles.methodIconWrap, { backgroundColor: method.bgColor }]}>
                    {method.icon}
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>{method.label}</Text>
                    <Text style={styles.methodDesc}>{method.description}</Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 120 }} />
          </View>
        )}

        {step === 'preview' && (
          <View style={styles.stepContent}>
            <View style={styles.previewSummaryCard}>
              <View style={styles.previewSummaryRow}>
                <Building2 size={16} color={Colors.navyDark} />
                <Text style={styles.previewSummaryLabel}>Business:</Text>
                <Text style={styles.previewSummaryValue}>{businessName}</Text>
              </View>
              <View style={styles.previewSummaryRow}>
                <Users size={16} color={Colors.navyDark} />
                <Text style={styles.previewSummaryLabel}>Contact:</Text>
                <Text style={styles.previewSummaryValue}>{contactName}</Text>
              </View>
              {businessEmail ? (
                <View style={styles.previewSummaryRow}>
                  <Mail size={16} color={Colors.navyDark} />
                  <Text style={styles.previewSummaryLabel}>Email:</Text>
                  <Text style={styles.previewSummaryValue}>{businessEmail}</Text>
                </View>
              ) : null}
              {businessPhone ? (
                <View style={styles.previewSummaryRow}>
                  <Phone size={16} color={Colors.navyDark} />
                  <Text style={styles.previewSummaryLabel}>Phone:</Text>
                  <Text style={styles.previewSummaryValue}>{businessPhone}</Text>
                </View>
              ) : null}
              <View style={styles.previewSummaryRow}>
                <Send size={16} color={Colors.navyDark} />
                <Text style={styles.previewSummaryLabel}>Method:</Text>
                <Text style={styles.previewSummaryValue}>
                  {sendMethods.find(m => m.id === selectedMethod)?.label ?? ''}
                </Text>
              </View>
            </View>

            <View style={styles.messageSection}>
              <View style={styles.messageLabelRow}>
                <Text style={styles.messageSectionTitle}>Invitation Message</Text>
                <TouchableOpacity onPress={() => setCustomMessage(defaultMessage)}>
                  <Text style={styles.resetMessageBtn}>Reset</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.messageInput}
                value={customMessage || defaultMessage}
                onChangeText={setCustomMessage}
                multiline
                textAlignVertical="top"
                placeholder="Your invitation message..."
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.linkPreviewCard}>
              <View style={styles.linkPreviewHeader}>
                <Link2 size={16} color="#0D9488" />
                <Text style={styles.linkPreviewTitle}>Invite Link Preview</Text>
              </View>
              <View style={styles.linkPreviewBody}>
                <Text style={styles.linkPreviewUrl}>
                  https://touchpoint.app/join/business?ref={currentUser.id.slice(0, 6)}
                </Text>
                <Text style={styles.linkPreviewNote}>
                  A unique referral code will be generated when you send. The business will use this code to sign up, automatically linking your accounts.
                </Text>
              </View>
            </View>

            <View style={styles.rewardPreviewCard}>
              <View style={styles.rewardPreviewIcon}>
                <Gift size={20} color="#F59E0B" />
              </View>
              <View style={styles.rewardPreviewContent}>
                <Text style={styles.rewardPreviewTitle}>Rewards on Join</Text>
                <Text style={styles.rewardPreviewDesc}>
                  You'll earn <Text style={styles.rewardHighlight}>100 points</Text> and the business gets a <Text style={styles.rewardHighlight}>free trial</Text> when they join through your link.
                </Text>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {step === 'details' && (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceedDetails && styles.nextBtnDisabled]}
            onPress={handleGoToMethod}
            activeOpacity={0.8}
            disabled={!canProceedDetails}
          >
            <Text style={[styles.nextBtnText, !canProceedDetails && styles.nextBtnTextDisabled]}>
              Next — Choose Send Method
            </Text>
            <ChevronRight size={18} color={canProceedDetails ? '#fff' : Colors.textTertiary} />
          </TouchableOpacity>
        )}

        {step === 'method' && (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceedMethod && styles.nextBtnDisabled]}
            onPress={handleGoToPreview}
            activeOpacity={0.8}
            disabled={!canProceedMethod}
          >
            <Text style={[styles.nextBtnText, !canProceedMethod && styles.nextBtnTextDisabled]}>
              Next — Review Invitation
            </Text>
            <ChevronRight size={18} color={canProceedMethod ? '#fff' : Colors.textTertiary} />
          </TouchableOpacity>
        )}

        {step === 'preview' && (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Send size={18} color="#fff" />
            <Text style={styles.sendBtnText}>Send Invitation</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleDismissSuccess}
      >
        <View style={styles.successOverlay}>
          <Animated.View
            style={[
              styles.successCard,
              {
                transform: [{
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                }],
                opacity: successAnim,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.successCheckCircle,
                {
                  transform: [{
                    scale: checkAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  }],
                },
              ]}
            >
              <CheckCircle2 size={48} color="#10B981" fill="#10B981" />
            </Animated.View>

            <Text style={styles.successTitle}>Invitation Sent!</Text>
            <Text style={styles.successSubtitle}>
              Your invitation to <Text style={styles.successBold}>{lastInvitation?.businessName}</Text> has been sent successfully.
            </Text>

            {lastInvitation?.code && (
              <View style={styles.successCodeCard}>
                <Text style={styles.successCodeLabel}>Referral Link Code</Text>
                <Text style={styles.successCodeValue}>{lastInvitation.code}</Text>
                <Text style={styles.successCodeNote}>
                  This code links your account with the business when they join. Stored in the database for automatic matching.
                </Text>
              </View>
            )}

            <View style={styles.successLinkInfo}>
              <Link2 size={16} color="#0D9488" />
              <Text style={styles.successLinkText}>
                When {lastInvitation?.businessName} downloads TouchPoint and uses your invite code, you'll both be automatically connected in the app.
              </Text>
            </View>

            <View style={styles.successActions}>
              <TouchableOpacity style={styles.successPrimaryBtn} onPress={handleDismissSuccess} activeOpacity={0.8}>
                <Text style={styles.successPrimaryBtnText}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successSecondaryBtn} onPress={handleSendAnother} activeOpacity={0.8}>
                <Text style={styles.successSecondaryBtnText}>Invite Another Business</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  headerRight: {
    width: 34,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 50,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepDotActive: {
    backgroundColor: '#fff',
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepDotInactive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10B981',
  },
  stepLineInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    paddingTop: 4,
  },
  introBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  introBannerGradient: {
    padding: 20,
    alignItems: 'center',
  },
  introBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introBannerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  introBannerText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  introBenefits: {
    alignSelf: 'stretch',
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FCD34D',
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.9)',
  },
  formSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  howItWorksSection: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  flowSteps: {
    gap: 0,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  flowStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStepNumberText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#fff',
  },
  flowStepContent: {
    flex: 1,
    paddingTop: 2,
  },
  flowStepTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  flowStepDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  flowConnector: {
    width: 2,
    height: 16,
    backgroundColor: Colors.borderLight,
    marginLeft: 13,
  },
  recentSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  recentStatus: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recentCode: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  methodHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  methodSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  methodSummaryText: {
    flex: 1,
  },
  methodSummaryTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  methodSummarySubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  methodSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  methodCardSelected: {
    borderColor: Colors.navyDark,
    backgroundColor: '#F0F4F8',
  },
  methodIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  methodLabelSelected: {
    color: Colors.navyDark,
  },
  methodDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.navyDark,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.navyDark,
  },
  previewSummaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewSummaryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    width: 65,
  },
  previewSummaryValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  messageSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  messageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  resetMessageBtn: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0D9488',
  },
  messageInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 200,
    maxHeight: 300,
  },
  linkPreviewCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    overflow: 'hidden',
  },
  linkPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#CCFBF1',
  },
  linkPreviewTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#0D9488',
  },
  linkPreviewBody: {
    padding: 14,
    gap: 8,
  },
  linkPreviewUrl: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#0D9488',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkPreviewNote: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  rewardPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  rewardPreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardPreviewContent: {
    flex: 1,
  },
  rewardPreviewTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 2,
  },
  rewardPreviewDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#78350F',
    lineHeight: 17,
  },
  rewardHighlight: {
    fontWeight: '700' as const,
    color: '#D97706',
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navyDark,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextBtnDisabled: {
    backgroundColor: Colors.borderLight,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  nextBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,30,50,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 16,
  },
  successCheckCircle: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 16,
  },
  successBold: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  successCodeCard: {
    alignSelf: 'stretch',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 14,
  },
  successCodeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#0D9488',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  successCodeValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#0D9488',
    letterSpacing: 1,
    marginBottom: 8,
  },
  successCodeNote: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
  successLinkInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  successLinkText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  successActions: {
    alignSelf: 'stretch',
    gap: 10,
  },
  successPrimaryBtn: {
    backgroundColor: Colors.navyDark,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  successSecondaryBtn: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  successSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
});

