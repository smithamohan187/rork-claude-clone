import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  UserCheck,
  Users,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  ArrowRightLeft,
  Key,
  Mail,
  Phone,
  X,
  ShieldCheck,
  Crown,
  Settings,
  BarChart3,
  FileText,
  CreditCard,
  Eye,
  Trash2,
  UserMinus,
  UserPlus,
  History,
  CircleDot,
  Send,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  mockBusinessTeamMembers,
  mockAdminTransferHistory,
} from '@/mocks/data';
import type { BusinessTeamMember, AdminTransferRequest } from '@/mocks/data';

type TransferStep = 'overview' | 'select_member' | 'confirm_transfer' | 'verify_identity' | 'processing' | 'complete';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', color: '#F59E0B', bg: '#FEF3C7', icon: Crown },
  admin: { label: 'Admin', color: '#3B82F6', bg: '#EFF6FF', icon: ShieldCheck },
  manager: { label: 'Manager', color: '#00B246', bg: '#E8F5EE', icon: Settings },
  staff: { label: 'Staff', color: '#6B7280', bg: '#F3F4F6', icon: Users },
};

const PERMISSION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  full_access: { label: 'Full Access', icon: Shield, color: '#F59E0B' },
  billing: { label: 'Billing & Payments', icon: CreditCard, color: '#10B981' },
  team_management: { label: 'Team Management', icon: Users, color: '#3B82F6' },
  content: { label: 'Content & Posts', icon: FileText, color: '#00B246' },
  analytics: { label: 'Analytics & Reports', icon: BarChart3, color: '#EC4899' },
  settings: { label: 'Business Settings', icon: Settings, color: '#00B246' },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function StatusBadge({ status }: { status: AdminTransferRequest['status'] }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    pending_verification: { label: 'Pending Verification', color: '#F59E0B', bg: '#FEF3C7' },
    pending_approval: { label: 'Pending Approval', color: '#3B82F6', bg: '#EFF6FF' },
    approved: { label: 'Approved', color: '#10B981', bg: '#D1FAE5' },
    rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
    completed: { label: 'Completed', color: '#22C55E', bg: '#F0FDF4' },
    cancelled: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
  };
  const c = config[status] ?? config.cancelled;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <View style={[badgeStyles.dot, { backgroundColor: c.color }]} />
      <Text style={[badgeStyles.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});

export default function BusinessAdminTransferScreen() {
  const router = useRouter();
  const { personalUser, businessProfileData } = useAuth();

  const [currentStep, setCurrentStep] = useState<TransferStep>('overview');
  const [selectedMember, setSelectedMember] = useState<BusinessTeamMember | null>(null);
  const [transferReason, setTransferReason] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isCodeSent, setIsCodeSent] = useState<boolean>(false);
  const [showTransferHistory, setShowTransferHistory] = useState<boolean>(false);
  const [showMemberDetail, setShowMemberDetail] = useState<BusinessTeamMember | null>(null);
  const [showRemoveMember, setShowRemoveMember] = useState<BusinessTeamMember | null>(null);
  const [showRoleChange, setShowRoleChange] = useState<BusinessTeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<BusinessTeamMember[]>(mockBusinessTeamMembers);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const processingPulse = useRef(new Animated.Value(1)).current;

  const currentOwner = useMemo(() => teamMembers.find(m => m.role === 'owner'), [teamMembers]);
  const eligibleMembers = useMemo(() => teamMembers.filter(m => m.role !== 'owner' && m.isVerified), [teamMembers]);

  const handleSelectMember = useCallback((member: BusinessTeamMember) => {
    setSelectedMember(member);
    setCurrentStep('confirm_transfer');
    console.log('[AdminTransfer] Selected member for transfer:', member.name);
  }, []);

  const handleSendVerificationCode = useCallback(() => {
    setIsCodeSent(true);
    console.log('[AdminTransfer] Verification code sent to:', personalUser.email || 'registered email');
    Alert.alert(
      'Verification Code Sent',
      'A 6-digit code has been sent to your registered email and phone. For demo purposes, use code: 482916',
      [{ text: 'OK' }]
    );
  }, [personalUser.email]);

  const handleVerifyAndTransfer = useCallback(() => {
    if (verificationCode !== '482916') {
      Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
      return;
    }
    if (!confirmPassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to confirm the transfer.');
      return;
    }

    setCurrentStep('processing');

    Animated.loop(
      Animated.sequence([
        Animated.timing(processingPulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(processingPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    setTimeout(() => {
      processingPulse.stopAnimation();
      setCurrentStep('complete');
      Animated.spring(successScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }).start();
      console.log('[AdminTransfer] Transfer completed to:', selectedMember?.name);
    }, 3500);
  }, [verificationCode, confirmPassword, selectedMember, progressAnim, successScale, processingPulse]);

  const handleRemoveMember = useCallback((member: BusinessTeamMember) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name} from the business team? Their access will be revoked immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setTeamMembers(prev => prev.filter(m => m.id !== member.id));
            setShowRemoveMember(null);
            console.log('[AdminTransfer] Member removed:', member.name);
            Alert.alert('Member Removed', `${member.name} has been removed from the team.`);
          },
        },
      ]
    );
  }, []);

  const handleChangeRole = useCallback((member: BusinessTeamMember, newRole: BusinessTeamMember['role']) => {
    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
    setShowRoleChange(null);
    console.log('[AdminTransfer] Role changed for', member.name, 'to', newRole);
    Alert.alert('Role Updated', `${member.name} is now a ${ROLE_CONFIG[newRole].label}.`);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <Shield size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Business Account Administration</Text>
        <Text style={styles.heroSubtitle}>
          Manage team roles, transfer ownership, and maintain secure control of your business account.
        </Text>
      </View>

      <View style={styles.currentAdminCard}>
        <Text style={styles.cardSectionLabel}>CURRENT ACCOUNT OWNER</Text>
        <View style={styles.adminRow}>
          <View style={styles.adminAvatarWrap}>
            <Image source={{ uri: currentOwner?.avatar ?? personalUser.avatar }} style={styles.adminAvatar} />
            <View style={styles.ownerBadge}>
              <Crown size={10} color="#F59E0B" />
            </View>
          </View>
          <View style={styles.adminInfo}>
            <Text style={styles.adminName}>{currentOwner?.name ?? personalUser.name}</Text>
            <Text style={styles.adminUsername}>@{currentOwner?.username ?? personalUser.username}</Text>
            <Text style={styles.adminMeta}>Owner since {formatDate(currentOwner?.joinedAt ?? '2024-06-15')}</Text>
          </View>
          <View style={styles.verifiedTag}>
            <CheckCircle size={12} color="#22C55E" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
      </View>

      <View style={styles.securityCard}>
        <View style={styles.securityHeader}>
          <Lock size={16} color="#F59E0B" />
          <Text style={styles.securityTitle}>Security Protocol</Text>
        </View>
        <Text style={styles.securityDesc}>
          Transferring business administration requires multi-step identity verification to protect your account. The process includes:
        </Text>
        <View style={styles.securitySteps}>
          {[
            { num: '1', text: 'Select a verified team member' },
            { num: '2', text: 'Provide reason for transfer' },
            { num: '3', text: 'Verify via email/SMS code' },
            { num: '4', text: 'Confirm with account password' },
          ].map((step) => (
            <View key={step.num} style={styles.securityStep}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.num}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.teamSection}>
        <View style={styles.teamHeader}>
          <Users size={16} color={Colors.text} />
          <Text style={styles.teamTitle}>Team Members ({teamMembers.length})</Text>
        </View>
        {teamMembers.map((member) => {
          const roleConf = ROLE_CONFIG[member.role];
          const RoleIcon = roleConf.icon;
          return (
            <TouchableOpacity
              key={member.id}
              style={styles.teamMemberRow}
              activeOpacity={0.65}
              onPress={() => setShowMemberDetail(member)}
              testID={`team-member-${member.id}`}
            >
              <View style={styles.memberAvatarWrap}>
                <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                {member.role === 'owner' && (
                  <View style={styles.memberOwnerBadge}>
                    <Crown size={8} color="#F59E0B" />
                  </View>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <View style={styles.memberRoleBadge}>
                  <RoleIcon size={10} color={roleConf.color} />
                  <Text style={[styles.memberRoleText, { color: roleConf.color }]}>{roleConf.label}</Text>
                </View>
                <Text style={styles.memberLastActive}>
                  Active {formatDate(member.lastActive)}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.primaryAction}
          activeOpacity={0.8}
          onPress={() => setCurrentStep('select_member')}
          testID="start-transfer-btn"
        >
          <ArrowRightLeft size={18} color="#fff" />
          <Text style={styles.primaryActionText}>Transfer Business Administration</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          activeOpacity={0.7}
          onPress={() => setShowTransferHistory(true)}
          testID="view-history-btn"
        >
          <History size={16} color={Colors.navyDark} />
          <Text style={styles.secondaryActionText}>View Transfer History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderSelectMember = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
      </View>
      <Text style={styles.stepTitle}>Step 1: Select New Administrator</Text>
      <Text style={styles.stepSubtitle}>
        Choose a verified team member to transfer business administration to. Only verified members with active accounts are eligible.
      </Text>

      {eligibleMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertTriangle size={32} color={Colors.warning} />
          <Text style={styles.emptyTitle}>No Eligible Members</Text>
          <Text style={styles.emptyDesc}>
            There are no verified team members available for transfer. Add and verify team members first.
          </Text>
        </View>
      ) : (
        <View style={styles.memberSelectList}>
          {eligibleMembers.map((member) => {
            const roleConf = ROLE_CONFIG[member.role];
            const RoleIcon = roleConf.icon;
            return (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberSelectCard,
                  selectedMember?.id === member.id && styles.memberSelectCardActive,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectMember(member)}
                testID={`select-member-${member.id}`}
              >
                <Image source={{ uri: member.avatar }} style={styles.selectAvatar} />
                <View style={styles.selectInfo}>
                  <Text style={styles.selectName}>{member.name}</Text>
                  <Text style={styles.selectUsername}>@{member.username}</Text>
                  <View style={styles.selectRoleRow}>
                    <View style={[styles.selectRoleBadge, { backgroundColor: roleConf.bg }]}>
                      <RoleIcon size={10} color={roleConf.color} />
                      <Text style={[styles.selectRoleText, { color: roleConf.color }]}>{roleConf.label}</Text>
                    </View>
                    <View style={styles.selectVerified}>
                      <CheckCircle size={11} color="#22C55E" />
                      <Text style={styles.selectVerifiedText}>Verified</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.selectArrow}>
                  <ArrowRightLeft size={16} color={Colors.textTertiary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={styles.backStepBtn}
        onPress={() => setCurrentStep('overview')}
        activeOpacity={0.7}
      >
        <ArrowLeft size={16} color={Colors.textSecondary} />
        <Text style={styles.backStepText}>Back to Overview</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderConfirmTransfer = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotCompleted]}>
            <CheckCircle size={10} color="#fff" />
          </View>
          <View style={[styles.stepLine, styles.stepLineActive]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepTitle}>Step 2: Confirm Transfer Details</Text>

        <View style={styles.transferPreview}>
          <View style={styles.transferParty}>
            <Image source={{ uri: currentOwner?.avatar ?? personalUser.avatar }} style={styles.transferAvatar} />
            <Text style={styles.transferPartyName}>{currentOwner?.name ?? personalUser.name}</Text>
            <View style={[styles.transferRoleBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.transferRoleText, { color: '#F59E0B' }]}>Current Owner</Text>
            </View>
          </View>
          <View style={styles.transferArrowWrap}>
            <ArrowRightLeft size={22} color={Colors.coral} />
          </View>
          <View style={styles.transferParty}>
            <Image source={{ uri: selectedMember?.avatar ?? '' }} style={styles.transferAvatar} />
            <Text style={styles.transferPartyName}>{selectedMember?.name ?? ''}</Text>
            <View style={[styles.transferRoleBadge, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.transferRoleText, { color: '#3B82F6' }]}>New Owner</Text>
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <AlertTriangle size={18} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Important Notice</Text>
            <Text style={styles.warningText}>
              This action will transfer full ownership including billing access, team management, and all administrative controls. Your role will be changed to Admin.
            </Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>REASON FOR TRANSFER</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please provide a reason for this transfer..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={transferReason}
            onChangeText={setTransferReason}
            testID="transfer-reason-input"
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryAction, !transferReason.trim() && styles.actionDisabled]}
          activeOpacity={0.8}
          onPress={() => {
            if (!transferReason.trim()) {
              Alert.alert('Required', 'Please provide a reason for the transfer.');
              return;
            }
            setCurrentStep('verify_identity');
          }}
          disabled={!transferReason.trim()}
          testID="proceed-verify-btn"
        >
          <Key size={18} color="#fff" />
          <Text style={styles.primaryActionText}>Proceed to Verification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backStepBtn}
          onPress={() => setCurrentStep('select_member')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={Colors.textSecondary} />
          <Text style={styles.backStepText}>Change Selection</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderVerifyIdentity = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotCompleted]}>
            <CheckCircle size={10} color="#fff" />
          </View>
          <View style={[styles.stepLine, styles.stepLineActive]} />
          <View style={[styles.stepDot, styles.stepDotCompleted]}>
            <CheckCircle size={10} color="#fff" />
          </View>
          <View style={[styles.stepLine, styles.stepLineActive]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>
        <Text style={styles.stepTitle}>Step 3: Verify Your Identity</Text>
        <Text style={styles.stepSubtitle}>
          For security, please verify your identity before completing the transfer.
        </Text>

        <View style={styles.verifyCard}>
          <View style={styles.verifySection}>
            <View style={styles.verifySectionHeader}>
              <Mail size={16} color="#3B82F6" />
              <Text style={styles.verifySectionTitle}>Email Verification Code</Text>
            </View>
            {!isCodeSent ? (
              <TouchableOpacity
                style={styles.sendCodeBtn}
                activeOpacity={0.8}
                onPress={handleSendVerificationCode}
                testID="send-code-btn"
              >
                <Send size={14} color="#fff" />
                <Text style={styles.sendCodeText}>Send Verification Code</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.codeInputWrap}>
                <Text style={styles.codeSentText}>Code sent to a***@email.com</Text>
                <TextInput
                  style={styles.codeInput}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  testID="verification-code-input"
                />
              </View>
            )}
          </View>

          <View style={styles.verifySectionDivider} />

          <View style={styles.verifySection}>
            <View style={styles.verifySectionHeader}>
              <Lock size={16} color="#00B246" />
              <Text style={styles.verifySectionTitle}>Confirm Password</Text>
            </View>
            <View style={styles.passwordInputWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your account password"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                testID="confirm-password-input"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <Eye size={18} color={Colors.textTertiary} />
                ) : (
                  <Eye size={18} color={Colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.dangerAction,
            (!verificationCode || !confirmPassword.trim()) && styles.actionDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleVerifyAndTransfer}
          disabled={!verificationCode || !confirmPassword.trim()}
          testID="confirm-transfer-btn"
        >
          <ArrowRightLeft size={18} color="#fff" />
          <Text style={styles.dangerActionText}>Confirm & Transfer Administration</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backStepBtn}
          onPress={() => setCurrentStep('confirm_transfer')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={Colors.textSecondary} />
          <Text style={styles.backStepText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderProcessing = () => (
    <View style={styles.centeredContainer}>
      <Animated.View style={[styles.processingCard, { transform: [{ scale: processingPulse }] }]}>
        <View style={styles.processingIconWrap}>
          <Lock size={32} color="#fff" />
        </View>
        <Text style={styles.processingTitle}>Processing Transfer</Text>
        <Text style={styles.processingSubtitle}>
          Securely transferring business administration...
        </Text>
        <View style={styles.progressBarWrap}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        <View style={styles.processingSteps}>
          <View style={styles.processingStep}>
            <CheckCircle size={14} color="#22C55E" />
            <Text style={styles.processingStepText}>Identity verified</Text>
          </View>
          <View style={styles.processingStep}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.processingStepText}>Updating permissions...</Text>
          </View>
          <View style={styles.processingStep}>
            <Clock size={14} color={Colors.textTertiary} />
            <Text style={[styles.processingStepText, { color: Colors.textTertiary }]}>Notifying team members...</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderComplete = () => (
    <View style={styles.centeredContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.completeScroll}>
        <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={40} color="#22C55E" />
          </View>
          <Text style={styles.successTitle}>Transfer Complete</Text>
          <Text style={styles.successSubtitle}>
            Business administration has been securely transferred.
          </Text>

          <View style={styles.successDetails}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>New Owner</Text>
              <View style={styles.successDetailValue}>
                <Image source={{ uri: selectedMember?.avatar ?? '' }} style={styles.successDetailAvatar} />
                <Text style={styles.successDetailText}>{selectedMember?.name}</Text>
              </View>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Your New Role</Text>
              <View style={styles.successDetailValue}>
                <ShieldCheck size={14} color="#3B82F6" />
                <Text style={styles.successDetailText}>Admin</Text>
              </View>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Effective</Text>
              <Text style={styles.successDetailText}>Immediately</Text>
            </View>
          </View>

          <View style={styles.successNote}>
            <Shield size={14} color="#3B82F6" />
            <Text style={styles.successNoteText}>
              You retain Admin access. The new owner will receive a notification and confirmation email.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryAction}
            activeOpacity={0.8}
            onPress={() => router.back()}
            testID="done-btn"
          >
            <Text style={styles.primaryActionText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 'overview': return renderOverview();
      case 'select_member': return renderSelectMember();
      case 'confirm_transfer': return renderConfirmTransfer();
      case 'verify_identity': return renderVerifyIdentity();
      case 'processing': return renderProcessing();
      case 'complete': return renderComplete();
      default: return renderOverview();
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => {
              if (currentStep === 'overview' || currentStep === 'complete') {
                router.back();
              } else {
                Alert.alert(
                  'Cancel Transfer',
                  'Are you sure you want to cancel the transfer process?',
                  [
                    { text: 'Continue', style: 'cancel' },
                    { text: 'Cancel Transfer', style: 'destructive', onPress: () => setCurrentStep('overview') },
                  ]
                );
              }
            }}
            activeOpacity={0.7}
            testID="admin-transfer-back"
          >
            <ArrowLeft size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Shield size={16} color={Colors.bannerText} />
            <Text style={styles.headerTitle}>Account Admin</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      {renderContent()}

      <Modal
        visible={showTransferHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTransferHistory(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <History size={18} color={Colors.navyDark} />
              <Text style={styles.modalTitle}>Transfer History</Text>
            </View>
            <TouchableOpacity onPress={() => setShowTransferHistory(false)} style={styles.modalClose} activeOpacity={0.7}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {mockAdminTransferHistory.map((transfer) => (
              <View key={transfer.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <StatusBadge status={transfer.status} />
                  <Text style={styles.historyDate}>{formatDate(transfer.requestedAt)}</Text>
                </View>
                <View style={styles.historyTransferRow}>
                  <View style={styles.historyParty}>
                    <Image source={{ uri: transfer.fromMemberAvatar }} style={styles.historyAvatar} />
                    <Text style={styles.historyPartyName} numberOfLines={1}>{transfer.fromMemberName}</Text>
                  </View>
                  <ArrowRightLeft size={14} color={Colors.textTertiary} />
                  <View style={styles.historyParty}>
                    <Image source={{ uri: transfer.toMemberAvatar }} style={styles.historyAvatar} />
                    <Text style={styles.historyPartyName} numberOfLines={1}>{transfer.toMemberName}</Text>
                  </View>
                </View>
                <Text style={styles.historyReason}>{transfer.reason}</Text>
                {transfer.completedAt && (
                  <View style={styles.historyCompletedRow}>
                    <CheckCircle size={12} color="#22C55E" />
                    <Text style={styles.historyCompletedText}>Completed {formatDate(transfer.completedAt)}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!showMemberDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMemberDetail(null)}
      >
        <SafeAreaView style={styles.modalSafe}>
          {showMemberDetail && (() => {
            const member = showMemberDetail;
            const roleConf = ROLE_CONFIG[member.role];
            return (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Team Member</Text>
                  <TouchableOpacity onPress={() => setShowMemberDetail(null)} style={styles.modalClose} activeOpacity={0.7}>
                    <X size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.modalScroll}>
                  <View style={styles.memberDetailTop}>
                    <Image source={{ uri: member.avatar }} style={styles.memberDetailAvatar} />
                    <Text style={styles.memberDetailName}>{member.name}</Text>
                    <Text style={styles.memberDetailUsername}>@{member.username}</Text>
                    <View style={[styles.memberDetailRoleBadge, { backgroundColor: roleConf.bg }]}>
                      <Text style={[styles.memberDetailRoleText, { color: roleConf.color }]}>{roleConf.label}</Text>
                    </View>
                  </View>

                  <View style={styles.memberDetailCard}>
                    <Text style={styles.memberDetailSectionTitle}>Contact</Text>
                    <View style={styles.memberDetailRow}>
                      <Mail size={14} color={Colors.textSecondary} />
                      <Text style={styles.memberDetailRowText}>{member.email}</Text>
                    </View>
                    <View style={styles.memberDetailRow}>
                      <Phone size={14} color={Colors.textSecondary} />
                      <Text style={styles.memberDetailRowText}>{member.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.memberDetailCard}>
                    <Text style={styles.memberDetailSectionTitle}>Permissions</Text>
                    {member.permissions.map((perm) => {
                      const permConf = PERMISSION_LABELS[perm];
                      if (!permConf) return null;
                      const PermIcon = permConf.icon;
                      return (
                        <View key={perm} style={styles.permissionRow}>
                          <PermIcon size={14} color={permConf.color} />
                          <Text style={styles.permissionText}>{permConf.label}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.memberDetailCard}>
                    <Text style={styles.memberDetailSectionTitle}>Activity</Text>
                    <View style={styles.memberDetailRow}>
                      <Clock size={14} color={Colors.textSecondary} />
                      <Text style={styles.memberDetailRowText}>Joined {formatDate(member.joinedAt)}</Text>
                    </View>
                    <View style={styles.memberDetailRow}>
                      <CircleDot size={14} color="#22C55E" />
                      <Text style={styles.memberDetailRowText}>Last active {formatDate(member.lastActive)}</Text>
                    </View>
                  </View>

                  {member.role !== 'owner' && (
                    <View style={styles.memberDetailActions}>
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        activeOpacity={0.7}
                        onPress={() => {
                          setShowMemberDetail(null);
                          setTimeout(() => setShowRoleChange(member), 300);
                        }}
                      >
                        <Settings size={16} color="#3B82F6" />
                        <Text style={[styles.memberActionText, { color: '#3B82F6' }]}>Change Role</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.memberActionBtn, styles.memberActionDanger]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setShowMemberDetail(null);
                          setTimeout(() => handleRemoveMember(member), 300);
                        }}
                      >
                        <UserMinus size={16} color={Colors.coral} />
                        <Text style={[styles.memberActionText, { color: Colors.coral }]}>Remove from Team</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!showRoleChange}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRoleChange(null)}
      >
        <View style={styles.roleChangeOverlay}>
          <View style={styles.roleChangeCard}>
            <Text style={styles.roleChangeTitle}>Change Role for {showRoleChange?.name}</Text>
            {(['admin', 'manager', 'staff'] as const).map((role) => {
              const rc = ROLE_CONFIG[role];
              const RcIcon = rc.icon;
              const isCurrentRole = showRoleChange?.role === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleOption, isCurrentRole && styles.roleOptionActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (showRoleChange && !isCurrentRole) {
                      handleChangeRole(showRoleChange, role);
                    }
                  }}
                  disabled={isCurrentRole}
                >
                  <View style={[styles.roleOptionIcon, { backgroundColor: rc.bg }]}>
                    <RcIcon size={16} color={rc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleOptionLabel}>{rc.label}</Text>
                  </View>
                  {isCurrentRole && (
                    <View style={styles.currentRoleBadge}>
                      <Text style={styles.currentRoleBadgeText}>Current</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.roleChangeCancelBtn}
              onPress={() => setShowRoleChange(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.roleChangeCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.banner,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 36,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  currentAdminCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatarWrap: {
    position: 'relative' as const,
  },
  adminAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  ownerBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  adminInfo: {
    flex: 1,
    marginLeft: 14,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  adminUsername: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  adminMeta: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  securityCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  securityDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  securitySteps: {
    gap: 10,
  },
  securityStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  teamSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  teamTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  memberAvatarWrap: {
    position: 'relative' as const,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  memberOwnerBadge: {
    position: 'absolute' as const,
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  memberRoleText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  memberLastActive: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  actionButtons: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navyDark,
    paddingVertical: 15,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.1,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  dangerActionText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.1,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  bottomPadding: {
    height: 30,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 0,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.navyDark,
  },
  stepDotCompleted: {
    backgroundColor: '#22C55E',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.borderLight,
  },
  stepLineActive: {
    backgroundColor: '#22C55E',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  stepSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 19,
    paddingHorizontal: 32,
    marginTop: 8,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 6,
    lineHeight: 19,
  },
  memberSelectList: {
    marginHorizontal: 16,
    gap: 10,
  },
  memberSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  memberSelectCardActive: {
    borderColor: Colors.navyDark,
    backgroundColor: '#F8FAFD',
  },
  selectAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  selectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  selectUsername: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  selectRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  selectRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectRoleText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  selectVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  selectVerifiedText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  selectArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  backStepText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  transferPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  transferParty: {
    alignItems: 'center',
    flex: 1,
  },
  transferAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  transferPartyName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  transferRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  transferRoleText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  transferArrowWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  formGroup: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
  },
  verifyCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  verifySection: {
    padding: 16,
  },
  verifySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verifySectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  verifySectionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  sendCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendCodeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  codeInputWrap: {
    gap: 8,
  },
  codeSentText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500' as const,
  },
  codeInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 12,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    letterSpacing: 6,
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  processingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  processingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  processingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  progressBarWrap: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 3,
  },
  processingSteps: {
    gap: 10,
    width: '100%',
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processingStepText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  completeScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  successDetails: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  successDetailLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  successDetailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successDetailAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  successDetailText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  successDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  successNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  successNoteText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
    flex: 1,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  historyTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  historyParty: {
    alignItems: 'center',
    flex: 1,
  },
  historyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  historyPartyName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  historyReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  historyCompletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  historyCompletedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  memberDetailTop: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  memberDetailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  memberDetailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  memberDetailUsername: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberDetailRoleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
  },
  memberDetailRoleText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  memberDetailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  memberDetailSectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
  memberDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  memberDetailRowText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  permissionText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  memberDetailActions: {
    gap: 10,
    marginTop: 8,
  },
  memberActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  memberActionDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  memberActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  roleChangeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  roleChangeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  roleChangeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  roleOptionActive: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.navyMid,
  },
  roleOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  currentRoleBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentRoleBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  roleChangeCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  roleChangeCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});

