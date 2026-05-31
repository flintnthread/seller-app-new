import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';

export function DesktopHeader({ 
  isSidebarOpen, 
  onToggleSidebar 
}: { 
  isSidebarOpen?: boolean; 
  onToggleSidebar?: () => void; 
}) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {!isSidebarOpen && onToggleSidebar && (
        <Pressable 
          onPress={onToggleSidebar} 
          // @ts-ignore
          style={({ hovered }) => [
            styles.menuButton,
            hovered && { backgroundColor: '#f3f4f6' }
          ]}
        >
          <Ionicons name="menu-outline" size={22} color="#64748b" />
        </Pressable>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search orders, products..."
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.rightSection}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/(main)/notifications')}>
          <IconSymbol name="bell.fill" size={20} color="#666666" />
          <View style={styles.notificationBadge} />
        </Pressable>

        <Pressable style={styles.iconButton} onPress={() => router.push('/(main)/settingsModule')}>
          <Ionicons name="settings-outline" size={20} color="#666666" />
        </Pressable>
        
        <Pressable style={styles.avatar} onPress={() => router.push('/Profile')}>
          <Text style={styles.avatarText}>P</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backdropFilter: 'blur(12px)',
    position: 'sticky' as any,
    top: 0,
    zIndex: 50,
    gap: 16,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginRight: 4,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    height: 38,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#000',
    outlineStyle: 'none' as any,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingLeft: 8,
    marginLeft: 'auto' as any,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
