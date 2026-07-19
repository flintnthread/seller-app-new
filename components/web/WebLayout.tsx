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
  headerPadding,
}: {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  contentPadding: number;
  headerPadding: number;
}) {
  return (
    <View style={styles.mainArea}>
      <DesktopHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        contentPadding={headerPadding}
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
  // Page body inset — mobile-first product screens manage their own horizontal padding.
  const contentPadding =
    onboarding || (isNarrowWeb && mobileFirstProduct)
      ? 0
      : width < 480
        ? 12
        : isNarrowWeb
          ? 16
          : 24;
  // Header always keeps a left inset so the menu toggle isn't flush to the edge.
  const headerPadding =
    onboarding
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
          headerPadding={headerPadding}
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
    maxWidth: '100%',
    overflow: 'hidden',
  },
  contentScroll: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  contentContainer: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
});
