import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BusinessDashboard from '@/components/BusinessDashboard';
import PersonalisedFeedScreen from './personalised';

export default function HomeFeedScreen() {
  const { accountType } = useAuth();

  if (accountType === 'business') {
    return <BusinessDashboard />;
  }

  return <PersonalisedFeedScreen />;
}
