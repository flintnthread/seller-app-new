import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { usePathname } from 'expo-router';
import { Sidebar } from './Sidebar';
import { DesktopHeader } from './DesktopHeader';
import { ActiveHeaderProvider } from './HeaderContext';
import { useResponsive } from '@/hooks/useResponsive';
import { isOnboardingScreen, isMobileFirstProductScreen } from '@/lib/navigation/sellerNavConfig';

function WebMainContent({
  children,
  isSidebarOpen,
  onToggleSidebar,
  contentPadding,
}: {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  contentPadding: number;
}) {
  return (
    <View style={styles.mainArea}>
      <DesktopHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        contentPadding={contentPadding}
      />
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: contentPadding,
            paddingTop: 13,
            paddingBottom: contentPadding + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function WebLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isNarrowWeb, width } = useResponsive();
  const onboarding = isOnboardingScreen(pathname);
  const mobileFirstProduct = isMobileFirstProductScreen(pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isNarrowWeb);

  useEffect(() => {
    if (isNarrowWeb) {
      setIsSidebarOpen(false);
    }
  }, [isNarrowWeb]);

  const sidebarOverlay = isNarrowWeb;
  // Single horizontal inset for DesktopHeader search + page body.
  // Screens must not add another outer paddingHorizontal on web.
  const contentPadding =
    onboarding || (isNarrowWeb && mobileFirstProduct)
      ? 0
      : width < 480
        ? 12
        : isNarrowWeb
          ? 16
          : 24;

  return (
    <ActiveHeaderProvider>
      <View style={styles.container}>
        {isSidebarOpen ? (
          <Sidebar
            onClose={() => setIsSidebarOpen(false)}
            overlay={sidebarOverlay}
          />
        ) : null}
        {sidebarOverlay && isSidebarOpen ? (
          <Pressable
            style={styles.backdrop}
            onPress={() => setIsSidebarOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
        ) : null}
        <WebMainContent
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          contentPadding={contentPadding}
        >
          {children}
        </WebMainContent>
      </View>
    </ActiveHeaderProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F6FA',
    height: '100%' as any,
    overflow: 'hidden',
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 90,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  contentScroll: {
    flex: 1,
    minWidth: 0,
  },
  contentContainer: {
    width: '100%',
    minWidth: 0,
  },
});
