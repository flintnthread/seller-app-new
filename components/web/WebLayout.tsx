import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Sidebar } from './Sidebar';
import { DesktopHeader } from './DesktopHeader';
import { ActiveHeaderProvider } from './HeaderContext';

function WebMainContent({ children, isSidebarOpen, onToggleSidebar }: {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <View style={styles.mainArea}>
      <DesktopHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
      <ScrollView 
            style={styles.contentScroll} 
            contentContainerStyle={styles.contentContainer}
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <ActiveHeaderProvider>
      <View style={styles.container}>
        {isSidebarOpen && <Sidebar onClose={() => setIsSidebarOpen(false)} />}
        <WebMainContent
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(true)}
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
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
    width: '100%',
  },
});
