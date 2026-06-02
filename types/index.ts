export type AccountType = 'personal' | 'business' | 'admin';

export interface ProfileEntry {
  id: string;
  type: 'personal' | 'business';
  displayName: string;
  avatarUrl: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  accountType: AccountType;
  bio: string;
  followers: number;
  following: number;
  points: number;
  isOnline?: boolean;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  category?: string;
  hours?: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  createdAt: string;
  type: 'promotion' | 'announcement' | 'general' | 'admin';
  isPinned?: boolean;
  status?: 'active' | 'flagged' | 'removed';
}

export interface Product {
  id: string;
  seller: User;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
}

export interface VideoPresentationSlide {
  id: string;
  title: string;
  subtitle: string;
  backgroundImage: string;
  accentColor: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  ticks?: string;
  type?: 'text' | 'video_presentation';
  videoPresentation?: {
    title: string;
    thumbnail: string;
    slides: VideoPresentationSlide[];
    duration: string;
  };
}

export type MessageCategory = 'private' | 'bizcom' | 'referrals' | 'shares' | 'rateReview' | 'approvals' | 'declines';

export type RequestStatus = 'pending' | 'approved' | 'declined';

export type ReadStatus = 'sent' | 'delivered' | 'read';

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  category?: MessageCategory;
  requestStatus?: RequestStatus;
  rewardActivity?: string;
  readStatus?: ReadStatus;
}

export interface RewardRule {
  id: string;
  action: string;
  points: number;
  description: string;
  icon: string;
}

export interface Referral {
  id: string;
  referredUser: User;
  status: 'pending' | 'joined' | 'rewarded';
  pointsEarned: number;
  date: string;
}

export interface BizComFollower {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string;
  email?: string;
  phone?: string;
}

export interface BizCom {
  id: string;
  name: string;
  avatar: string;
  members: number;
  category: string;
  description: string;
  ownerId?: string;
  followers?: BizComFollower[];
}

export interface InvitationReferralCode {
  id: string;
  code: string;
  inviterId: string;
  inviterName: string;
  inviterAvatar: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  bizComId: string;
  bizComName: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'clicked' | 'registered' | 'joined';
  joinedUserId?: string;
  joinedUserName?: string;
  joinedUserAvatar?: string;
  joinedAt?: string;
  pointsAwarded?: number;
}

export interface OnboardingEvent {
  id: string;
  type: 'download' | 'signup' | 'code_verified' | 'referral_mapped' | 'bizcom_auto_invite_created' | 'bizcom_invite_sent' | 'bizcom_joined' | 'welcome_points';
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
}

export interface BizComAutoInvite {
  id: string;
  referralCodeId: string;
  referralCode: string;
  bizComId: string;
  bizComName: string;
  bizComAvatar: string;
  inviterId: string;
  inviterName: string;
  inviterAvatar: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  message: string;
  status: 'queued' | 'sent' | 'delivered' | 'accepted' | 'expired';
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface NewMemberOnboarding {
  id: string;
  referralCode: InvitationReferralCode;
  newMemberId: string;
  newMemberName: string;
  newMemberAvatar: string;
  newMemberPhone: string;
  bizComId: string;
  bizComName: string;
  bizComAvatar: string;
  inviterName: string;
  inviterAvatar: string;
  autoInviteMessage: string;
  bizComAutoInvite?: BizComAutoInvite;
  events: OnboardingEvent[];
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
}

export interface GoogleBusinessProfile {
  id: string;
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  rating: number;
  reviewCount: number;
  photo: string;
  hours: string;
  isVerified: boolean;
  isClaimed: boolean;
  latitude: number;
  longitude: number;
}

export type ReferralRequestType = 'generic' | 'goodwill' | 'custom';

export type ReferralStatus = 
  | 'sent'
  | 'declined_by_referrer'
  | 'accepted_by_referrer'
  | 'forwarded'
  | 'declined_by_referred'
  | 'accepted_by_referred'
  | 'declined_by_business'
  | 'confirmed_by_business';

export interface ReferralRequest {
  id: string;
  uniqueId: string;
  type: ReferralRequestType;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  referrerId: string;
  referrerName: string;
  referrerAvatar: string;
  referrerPhone: string;
  referredParties: ReferredParty[];
  personalMessage: string;
  referrerPoints: number;
  referredPoints: number;
  customReferralImage?: string;
  customNewMemberImage?: string;
  status: ReferralStatus;
  createdAt: string;
  forwardedById?: string;
  forwardedByName?: string;
  parentReferralId?: string;
}

export interface ReferredParty {
  id: string;
  uniqueId: string;
  name: string;
  avatar: string;
  phone: string;
  isAppMember: boolean;
  forwardMethod?: 'in_app' | 'sms' | 'email' | 'whatsapp' | 'facebook';
  status: ReferralStatus;
}

export interface BusinessInvitation {
  id: string;
  inviteLinkCode: string;
  inviterId: string;
  inviterName: string;
  inviterAvatar: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  contactName: string;
  method: 'sms' | 'email' | 'whatsapp' | 'share_link' | 'copy_link';
  message: string;
  status: 'pending' | 'clicked' | 'registered' | 'linked';
  createdAt: string;
  linkedBusinessId?: string;
  linkedBusinessName?: string;
  linkedAt?: string;
  pointsAwarded?: number;
}

export type BillingCycle = 'monthly' | 'annual';

export interface BizComMemberTier {
  id: string;
  minMembers: number;
  maxMembers: number | null;
  label: string;
  monthlyPrice: number;
  currency: string;
}

export interface BizComSubscriptionState {
  selectedTierId: string;
  isTrialActive: boolean;
  trialMonthsRemaining: number;
  currentMemberCount: number;
  paymentMethod: PaymentMethodInfo | null;
}

export interface PaymentMethodInfo {
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export interface SubscriptionFeature {
  id: string;
  label: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  features: SubscriptionFeature[];
  highlighted?: boolean;
  badge?: string;
}

export interface ActiveSubscription {
  planId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  startDate: string;
  nextBillingDate: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  trialEndsAt?: string;
}

export interface BusinessProfileData {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  businessPhoto?: string;
  businessLogo?: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  category: string;
  hours: string;
  referralOptIn?: boolean;
  designatedAdmin?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
}

export interface ActiveBizComSubscription {
  tierId: string;
  tierLabel: string;
  monthlyPrice: number;
  currency: string;
  currentMemberCount: number;
  startDate: string;
  nextBillingDate: string;
  status: 'active' | 'cancelled' | 'trialing';
  trialEndsAt?: string;
  paymentLast4?: string;
  paymentBrand?: string;
}
