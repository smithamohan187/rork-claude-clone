import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SectionList,
  TextInput,
  Animated,
  FlatList,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Send,
  Check,
  CheckCircle2,
  Circle,
  ChevronRight,
  Users,
  UserPlus,
  Mail,
  Edit3,
  X,
  Share2,
  Phone,
  CheckCheck,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { personalUsers, conversations, phoneContacts, bizComs } from '@/mocks/data';
import { useInvitations } from '@/contexts/InvitationContext';
import { useAuth } from '@/contexts/AuthContext';
import type { User, BizCom, InvitationReferralCode, BizComAutoInvite } from '@/types';
import type { PhoneContact } from '@/mocks/data';

type Step = 'contacts' | 'bizcom' | 'message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function InviteScreen() {
  const router = useRouter();
  const [search, setSearch] = useState<string>('');
  const [bizcomSearch, setBizcomSearch] = useState<string>('');
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>('contacts');
  const [selectedBizCom, setSelectedBizCom] = useState<BizCom | null>(null);

  const [draftMessage, setDraftMessage] = useState<string>('Invitation to join my TouchPoint Business Community');
  const [smsModal, setSmsModal] = useState<{ visible: boolean; to: string; toName: string; body: string; onSent: () => void }>({ visible: false, to: '', toName: '', body: '', onSent: () => {} });
  const smsSendAnim = useRef(new Animated.Value(0)).current;
  const [lastGeneratedCodes, setLastGeneratedCodes] = useState<InvitationReferralCode[]>([]);
  const [lastAutoInvites, setLastAutoInvites] = useState<BizComAutoInvite[]>([]);
  const { createInvitationCode, createBulkInvitationCodes, bizComAutoInvites } = useInvitations();
  const { currentUser } = useAuth();

  const onAppContacts = useMemo(() => {
    return phoneContacts
      .filter(c => c.isOnApp === true)
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [search]);

  const newInviteContacts = useMemo(() => {
    return phoneContacts
      .filter(c => !c.isOnApp)
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [search]);

  const filteredBizComs = useMemo(() => {
    return bizComs.filter(bc =>
      bc.name.toLowerCase().includes(bizcomSearch.toLowerCase())
    );
  }, [bizcomSearch]);

  type SectionData = {
    title: string;
    count: number;
    isOnApp: boolean;
    data: PhoneContact[];
  };

  const sections = useMemo<SectionData[]>(() => {
    const result: SectionData[] = [];
    if (onAppContacts.length > 0) {
      result.push({
        title: 'Contacts on TouchPoint',
        count: onAppContacts.length,
        isOnApp: true,
        data: onAppContacts,
      });
    }
    if (newInviteContacts.length > 0) {
      result.push({
        title: 'Invite to TouchPoint',
        count: newInviteContacts.length,
        isOnApp: false,
        data: newInviteContacts,
      });
    }
    return result;
  }, [onAppContacts, newInviteContacts]);

  const handleMessageOnApp = useCallback((contact: PhoneContact) => {
    const matchedUser = personalUsers.find(u => u.id === contact.linkedUserId);
    if (matchedUser) {
      const conv = conversations.find(c => c.participant.id === matchedUser.id);
      if (conv) {
        router.replace(`/chat/${conv.id}` as any);
        return;
      }
    }
    Alert.alert('Message', `Start a conversation with ${contact.name}`);
  }, [router]);

  const showSmsSimulation = useCallback((toName: string, toPhone: string, body: string, onSent: () => void) => {
    smsSendAnim.setValue(0);
    setSmsModal({ visible: true, to: toPhone, toName, body, onSent });
  }, [smsSendAnim]);

  const handleSmsSend = useCallback(() => {
    Animated.timing(smsSendAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        smsModal.onSent();
        setSmsModal({ visible: false, to: '', toName: '', body: '', onSent: () => {} });
      }, 800);
    });
  }, [smsModal, smsSendAnim]);

  const handleInvitePhone = useCallback((contact: PhoneContact) => {
    setSelectedIds(new Set([contact.id]));
    setStep('bizcom');
    console.log('[Invite] Single invite - navigating to BizCom step for:', contact.name);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectableIds = useMemo(() => {
    return newInviteContacts.filter(c => !invitedIds.has(c.id)).map(c => c.id);
  }, [newInviteContacts, invitedIds]);

  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  }, [allSelected, selectableIds]);

  const goToBizComStep = useCallback(() => {
    if (selectedIds.size === 0) return;
    setStep('bizcom');
    console.log('[Invite] Multi-select - navigating to BizCom step, count:', selectedIds.size);
  }, [selectedIds]);

  const goBackToContacts = useCallback(() => {
    setStep('contacts');
    setSelectedBizCom(null);
    setBizcomSearch('');
    console.log('[Invite] Navigated back to contacts');
  }, []);

  const goToMessageStep = useCallback(() => {
    if (!selectedBizCom) return;
    setStep('message');
    console.log('[Invite] Navigating to message step, BizCom:', selectedBizCom.name);
  }, [selectedBizCom]);

  const goBackToBizCom = useCallback(() => {
    setStep('bizcom');
    console.log('[Invite] Navigated back to BizCom step');
  }, []);

  const handleConfirmSend = useCallback(() => {
    if (selectedIds.size === 0 || !selectedBizCom) return;
    const selectedContacts = phoneContacts.filter(c => selectedIds.has(c.id));
    const names = selectedContacts.map(c => c.name.split(' ')[0]).join(', ');
    const phones = selectedContacts.map(c => c.phone).join(', ');

    const generatedCodes = createBulkInvitationCodes({
      inviterId: currentUser.id,
      inviterName: currentUser.name,
      inviterAvatar: currentUser.avatar,
      contacts: selectedContacts.map(c => ({
        contactId: c.id,
        contactName: c.name,
        contactPhone: c.phone,
        contactAvatar: c.avatar,
      })),
      bizComId: selectedBizCom.id,
      bizComName: selectedBizCom.name,
      message: draftMessage,
    });
    setLastGeneratedCodes(generatedCodes);

    setTimeout(() => {
      const newAutoInvites = bizComAutoInvites.filter(ai =>
        generatedCodes.some(gc => gc.id === ai.referralCodeId)
      );
      setLastAutoInvites(newAutoInvites);
    }, 100);

    const codesList = generatedCodes.map(gc => `${gc.contactName}: ${gc.code}`).join('\n');
    const smsBody = `${draftMessage}\n\nYou're invited to join "${selectedBizCom.name}" on TouchPoint — ${selectedBizCom.description}.\n\nReferral Code(s):\n${codesList}\n\nDownload here: https://apps.apple.com/app/touchpoint`;
    showSmsSimulation(names, phones, smsBody, () => {
      setInvitedIds(prev => {
        const next = new Set(prev);
        selectedIds.forEach(id => next.add(id));
        return next;
      });
      setSelectedIds(new Set());
      setSelectedBizCom(null);
      setDraftMessage('Invitation to join my TouchPoint Business Community');
      setLastAutoInvites([]);
      goBackToContacts();
    });
  }, [selectedIds, selectedBizCom, draftMessage, goBackToContacts, showSmsSimulation, createBulkInvitationCodes, currentUser, bizComAutoInvites]);

  const renderContactItem = useCallback(({ item }: { item: PhoneContact }) => {
    if (item.isOnApp) {
      return (
        <TouchableOpacity
          style={styles.contactRow}
          activeOpacity={0.6}
          onPress={() => handleMessageOnApp(item)}
        >
          <View style={styles.avatarContainer}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            {item.lastSeen === 'Online' && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.contactStatus} numberOfLines={1}>
              {item.status ?? 'Hey there! I am using TouchPoint'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => handleMessageOnApp(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MessageSquare size={18} color={Colors.navyDark} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    const wasInvited = invitedIds.has(item.id);
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.contactRow}
        activeOpacity={0.6}
        onPress={() => {
          if (!wasInvited) toggleSelect(item.id);
        }}
      >
        {!wasInvited && (
          <TouchableOpacity
            style={styles.selectCircle}
            onPress={() => toggleSelect(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSelected ? (
              <CheckCircle2 size={24} color={Colors.navyDark} fill={Colors.navyDark} />
            ) : (
              <Circle size={24} color={Colors.border} />
            )}
          </TouchableOpacity>
        )}
        {wasInvited && (
          <View style={styles.selectCircle}>
            <CheckCircle2 size={24} color={Colors.success} fill={Colors.success} />
          </View>
        )}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.contactPhone} numberOfLines={1}>{item.phone}</Text>
        </View>
        {wasInvited ? (
          <View style={styles.sentBadge}>
            <Check size={12} color={Colors.success} />
            <Text style={styles.sentText}>Sent</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => handleInvitePhone(item)}
          >
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }, [invitedIds, selectedIds, handleMessageOnApp, handleInvitePhone, toggleSelect]);

  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {section.isOnApp ? (
          <Users size={14} color={Colors.navyDark} />
        ) : (
          <UserPlus size={14} color={Colors.textSecondary} />
        )}
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{section.count}</Text>
        </View>
      </View>
      {!section.isOnApp && selectableIds.length > 0 && (
        <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAll}>
          <Text style={[styles.selectAllText, allSelected && styles.selectAllActive]}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ), [allSelected, selectableIds, handleSelectAll]);

  const renderBizComItem = useCallback(({ item }: { item: BizCom }) => {
    const isActive = selectedBizCom?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.bizcomRow, isActive && styles.bizcomRowActive]}
        activeOpacity={0.7}
        onPress={() => setSelectedBizCom(isActive ? null : item)}
      >
        <Image source={{ uri: item.avatar }} style={styles.bizcomAvatar} />
        <View style={styles.bizcomInfo}>
          <Text style={[styles.bizcomName, isActive && styles.bizcomNameActive]}>{item.name}</Text>
          <Text style={styles.bizcomDesc} numberOfLines={1}>{item.description}</Text>
          <View style={styles.bizcomMeta}>
            <Users size={12} color={Colors.textTertiary} />
            <Text style={styles.bizcomMembers}>{item.members.toLocaleString()} members</Text>
            <View style={styles.bizcomCatPill}>
              <Text style={styles.bizcomCatText}>{item.category}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
          {isActive && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    );
  }, [selectedBizCom]);

  const selectedContactNames = phoneContacts
    .filter(c => selectedIds.has(c.id))
    .map(c => c.name.split(' ')[0]);

  const contactSummary = selectedContactNames.length <= 3
    ? selectedContactNames.join(', ')
    : `${selectedContactNames.slice(0, 3).join(', ')} +${selectedContactNames.length - 3}`;

  const selectedCount = selectedIds.size;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'message') goBackToBizCom();
              else if (step === 'bizcom') goBackToContacts();
              else router.back();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {step === 'contacts' ? 'Invite Friends' : step === 'bizcom' ? 'Choose BizCom' : 'Review Message'}
            </Text>
            {step === 'contacts' && (
              <Text style={styles.headerSubtitle}>
                {phoneContacts.length} contacts · {onAppContacts.length} on TouchPoint
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {step === 'contacts' && selectedCount > 0 && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
              </View>
            )}
          </View>
        </View>

        {step === 'contacts' && (
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or number"
              placeholderTextColor={Colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {(step === 'bizcom' || step === 'message') && (
          <>
            <View style={styles.stepIndicator}>
              <View style={styles.stepDot}>
                <View style={[styles.stepDotInner, styles.stepDotCompleted]} />
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepDot}>
                <View style={[styles.stepDotInner, step === 'bizcom' ? styles.stepDotActive : styles.stepDotCompleted]} />
              </View>
              <View style={[styles.stepLine, step !== 'message' && styles.stepLineInactive]} />
              <View style={styles.stepDot}>
                <View style={[styles.stepDotInner, step === 'message' ? styles.stepDotActive : styles.stepDotInactive]} />
              </View>
            </View>
            <View style={styles.stepLabels}>
              <Text style={styles.stepLabelDone}>Contacts</Text>
              <Text style={step === 'bizcom' ? styles.stepLabelActive : styles.stepLabelDone}>BizCom</Text>
              <Text style={step === 'message' ? styles.stepLabelActive : styles.stepLabelPending}>Message</Text>
            </View>
            {step === 'bizcom' && (
              <View style={styles.searchBar}>
                <Search size={16} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search BizComs..."
                  placeholderTextColor={Colors.textTertiary}
                  value={bizcomSearch}
                  onChangeText={setBizcomSearch}
                />
                {bizcomSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setBizcomSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </SafeAreaView>

      {step === 'contacts' && selectedCount > 0 && (
        <View style={styles.selectedBar}>
          <FlatList
            data={phoneContacts.filter(c => selectedIds.has(c.id))}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedBarList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.selectedChip} onPress={() => toggleSelect(item.id)}>
                <Image source={{ uri: item.avatar }} style={styles.selectedChipAvatar} />
                <Text style={styles.selectedChipName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                <View style={styles.selectedChipRemove}>
                  <X size={10} color={Colors.bannerText} />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.contentArea}>
        {step === 'contacts' && (
          <View style={styles.stepContent}>
            <View style={styles.shareRow}>
              <TouchableOpacity style={styles.shareOption} onPress={() => {
                showSmsSimulation('Friend', '', 'Join me on TouchPoint — discover local businesses, earn rewards, and stay connected! Download here: https://apps.apple.com/app/touchpoint', () => {});
              }}>
                <View style={[styles.shareIconCircle, { backgroundColor: '#25D366' }]}>
                  <Share2 size={18} color="#FFF" />
                </View>
                <Text style={styles.shareOptionText}>Share invite link</Text>
              </TouchableOpacity>
            </View>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderContactItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyText}>No contacts found</Text>
                  <Text style={styles.emptySubText}>Try searching with a different name</Text>
                </View>
              }
            />
          </View>
        )}

        {step === 'bizcom' && (
          <View style={styles.stepContent}>
            <FlatList
              data={filteredBizComs}
              keyExtractor={(item) => item.id}
              renderItem={renderBizComItem}
              contentContainerStyle={styles.bizcomList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.bizcomHeader}>
                  <Text style={styles.bizcomHeaderTitle}>Select a BizCom</Text>
                  <Text style={styles.bizcomHeaderSub}>
                    Inviting {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''}: {contactSummary}
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyText}>No BizComs found</Text>
                </View>
              }
            />
          </View>
        )}

        {step === 'message' && selectedBizCom && (
          <View style={styles.stepContent}>
            <View style={styles.messageContainer}>
              <View style={styles.messageHeader}>
                <View style={styles.messageIconCircle}>
                  <Mail size={22} color={Colors.bannerText} />
                </View>
                <Text style={styles.messageHeaderTitle}>Draft Invitation</Text>
                <Text style={styles.messageHeaderSub}>
                  To {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''} · {selectedBizCom.name}
                </Text>
              </View>

              <View style={styles.messageCard}>
                <View style={styles.messageCardHeader}>
                  <Edit3 size={13} color={Colors.textSecondary} />
                  <Text style={styles.messageCardLabel}>Message</Text>
                </View>
                <TextInput
                  style={styles.draftInput}
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  multiline
                  textAlignVertical="top"
                  placeholder="Enter invitation message..."
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewBubble}>
                  <Text style={styles.previewText}>{draftMessage}</Text>
                  <Text style={styles.previewSubText}>
                    {"\n"}You're invited to join "{selectedBizCom.name}" on TouchPoint — {selectedBizCom.description}. Download here: https://apps.apple.com/app/touchpoint
                  </Text>
                </View>
              </View>

              <View style={styles.recipientsSummary}>
                <Users size={15} color={Colors.textSecondary} />
                <Text style={styles.recipientsSummaryText}>
                  Sending to: {contactSummary}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {step === 'contacts' && selectedCount > 0 && (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <TouchableOpacity style={styles.nextBtn} onPress={goToBizComStep} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              Next — Choose BizCom ({selectedCount})
            </Text>
            <ChevronRight size={18} color={Colors.bannerText} />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {step === 'bizcom' && (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.nextBtn, !selectedBizCom && styles.nextBtnDisabled]}
            onPress={goToMessageStep}
            activeOpacity={0.8}
            disabled={!selectedBizCom}
          >
            <Text style={[styles.nextBtnText, !selectedBizCom && styles.nextBtnTextDisabled]}>
              {selectedBizCom ? 'Next — Review Message' : 'Select a BizCom'}
            </Text>
            <ChevronRight size={18} color={selectedBizCom ? Colors.bannerText : Colors.textTertiary} />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {step === 'message' && (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.sendBtn, !draftMessage.trim() && styles.nextBtnDisabled]}
            onPress={handleConfirmSend}
            activeOpacity={0.8}
            disabled={!draftMessage.trim()}
          >
            <Send size={16} color={draftMessage.trim() ? Colors.bannerText : Colors.textTertiary} />
            <Text style={[styles.sendBtnText, !draftMessage.trim() && styles.nextBtnTextDisabled]}>
              Send {selectedIds.size} Invite{selectedIds.size > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
      <Modal
        visible={smsModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setSmsModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.smsOverlay}>
          <View style={styles.smsContainer}>
            <View style={styles.smsHeader}>
              <View style={styles.smsHeaderBar}>
                <TouchableOpacity
                  onPress={() => setSmsModal(prev => ({ ...prev, visible: false }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color={Colors.bannerText} />
                </TouchableOpacity>
                <Text style={styles.smsHeaderTitle}>New Message</Text>
                <View style={{ width: 20 }} />
              </View>
              <View style={styles.smsToRow}>
                <Text style={styles.smsToLabel}>To:</Text>
                <Text style={styles.smsToValue} numberOfLines={1}>{smsModal.toName}</Text>
              </View>
              <View style={styles.smsToRow}>
                <Phone size={12} color="rgba(255,255,255,0.5)" />
                <Text style={styles.smsPhoneValue} numberOfLines={1}>{smsModal.to}</Text>
              </View>
            </View>

            <View style={styles.smsBody}>
              <View style={styles.smsTimestamp}>
                <Text style={styles.smsTimestampText}>Today {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>

              <Animated.View
                style={[
                  styles.smsBubble,
                  {
                    opacity: smsSendAnim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [1, 1, 1],
                    }),
                    transform: [{
                      translateY: smsSendAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, -4, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Text style={styles.smsBubbleText}>{smsModal.body}</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.smsStatusRow,
                  {
                    opacity: smsSendAnim.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [0, 0, 1],
                    }),
                  },
                ]}
              >
                <CheckCheck size={14} color={Colors.success} />
                <Text style={styles.smsStatusText}>Delivered</Text>
              </Animated.View>

              {lastGeneratedCodes.length > 0 && (
                <Animated.View
                  style={[
                    styles.refCodeCard,
                    {
                      opacity: smsSendAnim.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [0, 0, 1],
                      }),
                    },
                  ]}
                >
                  <View style={styles.refCodeHeader}>
                    <View style={styles.refCodeIcon}>
                      <CheckCircle2 size={14} color={Colors.success} />
                    </View>
                    <Text style={styles.refCodeTitle}>Referral Code{lastGeneratedCodes.length > 1 ? 's' : ''} Generated</Text>
                  </View>
                  {lastGeneratedCodes.map(rc => (
                    <View key={rc.id} style={styles.refCodeRow}>
                      <Text style={styles.refCodeLabel}>{rc.contactName}</Text>
                      <View style={styles.refCodeBadge}>
                        <Text style={styles.refCodeValue}>{rc.code}</Text>
                      </View>
                    </View>
                  ))}
                  <Text style={styles.refCodeNote}>Codes stored in database for member tracking</Text>
                </Animated.View>
              )}

              {lastGeneratedCodes.length > 0 && (
                <Animated.View
                  style={[
                    styles.autoInviteCard,
                    {
                      opacity: smsSendAnim.interpolate({
                        inputRange: [0, 0.85, 1],
                        outputRange: [0, 0, 1],
                      }),
                      transform: [{
                        translateY: smsSendAnim.interpolate({
                          inputRange: [0, 0.85, 1],
                          outputRange: [10, 10, 0],
                        }),
                      }],
                    },
                  ]}
                >
                  <View style={styles.autoInviteHeader}>
                    <View style={styles.autoInviteIcon}>
                      <Mail size={14} color="#06B6D4" />
                    </View>
                    <Text style={styles.autoInviteTitle}>BizCom Auto-Invite Created</Text>
                  </View>
                  <View style={styles.autoInviteBubble}>
                    <View style={styles.autoInviteBizRow}>
                      {selectedBizCom && (
                        <Image source={{ uri: selectedBizCom.avatar }} style={styles.autoInviteBizAvatar} />
                      )}
                      <View style={styles.autoInviteBizInfo}>
                        <Text style={styles.autoInviteBizLabel}>From BizCom</Text>
                        <Text style={styles.autoInviteBizName}>{selectedBizCom?.name ?? 'BizCom'}</Text>
                      </View>
                    </View>
                    <Text style={styles.autoInviteMessage}>
                      Automatic invitation message created from "{selectedBizCom?.name}" and queued for delivery when {lastGeneratedCodes.length > 1 ? 'contacts download' : `${lastGeneratedCodes[0]?.contactName} downloads`} the app.
                    </Text>
                    {lastGeneratedCodes.map(rc => (
                      <View key={`ai_${rc.id}`} style={styles.autoInviteRecipient}>
                        <Image source={{ uri: rc.contactAvatar }} style={styles.autoInviteRecipientAvatar} />
                        <Text style={styles.autoInviteRecipientName}>{rc.contactName}</Text>
                        <View style={styles.autoInviteStatusPill}>
                          <Text style={styles.autoInviteStatusText}>Queued</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.autoInviteNote}>BizCom invitation will be delivered automatically inside the app upon download</Text>
                </Animated.View>
              )}
            </View>

            <View style={styles.smsFooter}>
              <TouchableOpacity
                style={styles.smsCancelBtn}
                onPress={() => setSmsModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.smsCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smsSendBtn}
                onPress={handleSmsSend}
                activeOpacity={0.8}
              >
                <Send size={16} color="#FFF" />
                <Text style={styles.smsSendText}>Send SMS</Text>
              </TouchableOpacity>
            </View>
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
    color: Colors.bannerText,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    backgroundColor: Colors.success,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.bannerText,
    paddingVertical: Platform.OS === 'web' ? 10 : 11,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 50,
    gap: 0,
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
    backgroundColor: '#FFF',
  },
  stepDotCompleted: {
    backgroundColor: Colors.success,
  },
  stepDotInactive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.success,
  },
  stepLineInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginTop: 4,
  },
  stepLabelActive: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  stepLabelDone: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  stepLabelPending: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.35)',
  },
  selectedBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 10,
  },
  selectedBarList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  selectedChip: {
    alignItems: 'center',
    width: 60,
    position: 'relative' as const,
  },
  selectedChipAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.navyDark,
  },
  selectedChipName: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.text,
    marginTop: 3,
    textAlign: 'center' as const,
  },
  selectedChipRemove: {
    position: 'absolute' as const,
    top: -2,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  shareIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.navyDark,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  stepContent: {
    flex: 1,
  },
  list: {
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.navyDark,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.navyLight,
  },
  selectAllActive: {
    color: Colors.navyDark,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  selectCircle: {
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  onlineBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  contactStatus: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  msgBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.bannerText,
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
  },
  sentText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 78,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
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
    color: Colors.bannerText,
  },
  nextBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.bannerText,
  },
  bizcomList: {
    paddingBottom: 100,
  },
  bizcomHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  bizcomHeaderTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  bizcomHeaderSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bizcomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  bizcomRowActive: {
    borderColor: Colors.navyDark,
    backgroundColor: '#F0F3F8',
  },
  bizcomAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  bizcomInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bizcomName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  bizcomNameActive: {
    color: Colors.navyDark,
  },
  bizcomDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bizcomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  bizcomMembers: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  bizcomCatPill: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  bizcomCatText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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
  messageContainer: {
    flex: 1,
    padding: 20,
  },
  messageHeader: {
    alignItems: 'center' as const,
    paddingVertical: 16,
    gap: 6,
  },
  messageIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageHeaderTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  messageHeaderSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  messageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    padding: 16,
    marginTop: 12,
  },
  messageCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  messageCardLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  draftInput: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    minHeight: 60,
    lineHeight: 22,
  },
  previewCard: {
    marginTop: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    padding: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  previewBubble: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.navyDark,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  previewSubText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  recipientsSummary: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  recipientsSummaryText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  smsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  smsContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 420,
  },
  smsHeader: {
    backgroundColor: Colors.banner,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  smsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  smsHeaderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.bannerText,
  },
  smsToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  smsToLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  smsToValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    flex: 1,
  },
  smsPhoneValue: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
  },
  smsBody: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F0F2F5',
    minHeight: 200,
  },
  smsTimestamp: {
    alignItems: 'center',
    marginBottom: 14,
  },
  smsTimestampText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  smsBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: Colors.navyDark,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 14,
  },
  smsBubbleText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#FFF',
    lineHeight: 20,
  },
  smsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 6,
    paddingRight: 4,
  },
  smsStatusText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.success,
  },
  refCodeCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  refCodeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  refCodeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  refCodeTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#166534',
  },
  refCodeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 5,
  },
  refCodeLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  refCodeBadge: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refCodeValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  refCodeNote: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#15803D',
    marginTop: 8,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  autoInviteCard: {
    backgroundColor: '#ECFEFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  autoInviteHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  autoInviteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CFFAFE',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  autoInviteTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#155E75',
  },
  autoInviteBubble: {
    backgroundColor: '#F0FDFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  autoInviteBizRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
    gap: 10,
  },
  autoInviteBizAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  autoInviteBizInfo: {
    flex: 1,
  },
  autoInviteBizLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#0E7490',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  autoInviteBizName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#155E75',
    marginTop: 1,
  },
  autoInviteMessage: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#164E63',
    lineHeight: 17,
    marginBottom: 8,
  },
  autoInviteRecipient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#CFFAFE',
  },
  autoInviteRecipientAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  autoInviteRecipientName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#164E63',
  },
  autoInviteStatusPill: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoInviteStatusText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  autoInviteNote: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#0E7490',
    marginTop: 8,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  smsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'web' ? 14 : 30,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  smsCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  smsCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  smsSendBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.success,
  },
  smsSendText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});

