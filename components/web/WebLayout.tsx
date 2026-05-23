import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Sidebar } from './Sidebar';
import { DesktopHeader } from './DesktopHeader';

export function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <Sidebar />
      <View style={styles.mainArea}>
        <DesktopHeader />
        <ScrollView 
          style={styles.contentScroll} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
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
