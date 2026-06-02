import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { isApiConfigured } from "@/api/client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import { paperTheme } from "@/theme/paperTheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerTypeProvider } from "@/contexts/CustomerTypeContext";
import { InvitationProvider } from "@/contexts/InvitationContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { ReferralProvider } from "@/contexts/ReferralContext";
import { BusinessInvitationProvider } from "@/contexts/BusinessInvitationContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { ReferralChatProvider } from "@/contexts/ReferralChatContext";
import { PostsProvider } from "@/contexts/PostsContext";
import { ManageContentProvider } from "@/contexts/ManageContentContext";
import TestModeSwitcher from "@/components/TestModeSwitcher";
import { SnackbarProvider, GlobalSnackbar } from "@/contexts/SnackbarContext";
import { SideDrawerProvider } from "@/contexts/SideDrawerContext";
import SideDrawer from "@/components/SideDrawer";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen
        name="index"
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="chat-thread/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="chat-detail/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="invite"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="invite-friends/contacts"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="invite-friends/review"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="create-ad"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="create-post"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="business/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="bizcom/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="promotion/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="reward-settings"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="referral-tracking"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="reward-configuration"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-analytics"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="new-member-onboarding"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="create-business-profile"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="subscription-plans"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="manage-subscription"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="manage-content"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="admin-login"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="admin-dashboard"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-rewards/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="full-map"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="claim-business/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="simple-reward-setup"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="personalised-request"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="bizcom-dashboard"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="touchpoints-verification"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="referral-request"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="business-admin-transfer"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="invite-business"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="sign-in"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="sign-up"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="otp-request"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="otp-verify"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="password-reset-sent"
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="business-profile/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="user-profile"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="notification-preferences"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="privacy-security"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="change-password"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="active-sessions"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="download-data"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="help-support"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="terms-conditions"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="create-offer"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="view-offer"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="offers"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-registration"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="view-event"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="saved-activity"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-list"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="public-profile"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="my-referrals"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="coupon/[id]"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="scan-coupon"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="referral-chat/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="feed-preview/new-user-feed"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="feed-preview/user-feed"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-qr/[id]"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="b/[id]"
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="full-feed"
        options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="new-post"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="edit-post/[id]"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="edit-offer/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="edit-event/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="edit-content-post/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="share-sms"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="share-email"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="business-invite-sms"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-invite-email"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-invite-whatsapp"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ai-studio"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ai-studio-history"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="invite-customers"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
      <GestureHandlerRootView>
        <AdminProvider>
          <AuthProvider>
            <CustomerTypeProvider>
            <SubscriptionProvider>
              <InvitationProvider>
                <ReferralProvider>
                  <BusinessInvitationProvider>
                    <CouponProvider>
                      <ReferralChatProvider>
                        <PostsProvider>
                        <ManageContentProvider>
                        <SnackbarProvider>
                          <SideDrawerProvider>
                            <RootLayoutNav />
                            <SideDrawer />
                            <TestModeSwitcher />
                            <GlobalSnackbar />
                          </SideDrawerProvider>
                        </SnackbarProvider>
                        </ManageContentProvider>
                        </PostsProvider>
                      </ReferralChatProvider>
                    </CouponProvider>
                  </BusinessInvitationProvider>
                </ReferralProvider>
              </InvitationProvider>
            </SubscriptionProvider>
            </CustomerTypeProvider>
          </AuthProvider>
        </AdminProvider>
      </GestureHandlerRootView>
      </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

