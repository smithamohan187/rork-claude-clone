import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

// Friend chat was unified into the single chat-detail screen. This route is kept
// only so any old links/navigations still resolve — it forwards to chat-detail.
// Primary flows (messages Friends tab, my-referrals) navigate to chat-detail directly.
export default function ReferralChatRedirect() {
  const params = useLocalSearchParams<{ id: string }>();
  return (
    <Redirect
      href={{
        pathname: '/chat-detail/[id]',
        params: { id: params.id ?? '' },
      }}
    />
  );
}
