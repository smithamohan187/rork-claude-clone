export interface ReferralPerson {
  id: string;
  profileId: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  relation: 'referred_by_me' | 'referred_me';
  joinedAt?: string;
}

export const referralNetwork: ReferralPerson[] = [
  {
    id: 'r-priya',
    profileId: 'profile-priya',
    name: 'Priya Nair',
    initials: 'PN',
    avatarColor: '#0F6E56',
    relation: 'referred_by_me',
    joinedAt: '10 Apr 2025',
  },
  {
    id: 'r-rahul',
    profileId: 'profile-rahul',
    name: 'Rahul Menon',
    initials: 'RM',
    avatarColor: '#185FA5',
    relation: 'referred_by_me',
    joinedAt: '12 Apr 2025',
  },
  {
    id: 'r-anjali',
    profileId: 'profile-anjali',
    name: 'Anjali Thomas',
    initials: 'AT',
    avatarColor: '#993556',
    relation: 'referred_by_me',
    joinedAt: '14 Apr 2025',
  },
  {
    id: 'r-arun',
    profileId: 'profile-arun',
    name: 'Arun Kumar',
    initials: 'AK',
    avatarColor: '#854F0B',
    relation: 'referred_me',
    joinedAt: '09 Apr 2025',
  },
];
