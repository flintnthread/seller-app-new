import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import { useProfileStatus } from '@/hooks/useProfileStatus';
import { useSweetAlert } from '@/components/common/SweetAlert';
import { clearSellerId } from '@/lib/api/sellerSession';
import { useResponsive } from '@/hooks/useResponsive';

export function DesktopHeader({ 
  isSidebarOpen, 
  onToggleSidebar,
  contentPadding = 24,
}: { 
  isSidebarOpen?: boolean; 
  onToggleSidebar?: () => void;
  /** Match WebLayout content inset so search aligns with page left edge */
  contentPadding?: number;
}) {
  const router = useRouter();
  const { profile } = useSellerProfile();
  const { isProfileCompleted } = useProfileStatus();
  const profileDone = profile?.profileCompleted === true || isProfileCompleted;
  const approval = profile?.approvalState ?? profile?.accountStatus?.approvalState;
  const showSellerTools = profileDone && approval === "approved";
  const { showSuccess, confirmAction, SweetAlertHost } = useSweetAlert();
  const [isHovered, setIsHovered] = useState(false);
  const { isNarrowWeb, isCompact } = useResponsive();

  const firstLetter = profile?.firstName?.trim()?.charAt(0)?.toUpperCase() || "P";

  const handleLogout = async () => {
    setIsHovered(false);
    const confirmed = await confirmAction(
      "Confirm Logout",
      "Are you sure you want to sign out from your seller account?",
      "Logout"
    );
    if (confirmed) {
      await clearSellerId();
      showSuccess("You have been signed out successfully.", "Logged Out");
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1500);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isNarrowWeb && styles.containerNarrow,
        { paddingHorizontal: contentPadding },
      ]}
    >
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

      <View style={[styles.searchContainer, isNarrowWeb && styles.searchContainerNarrow]}>
        <Ionicons name="search-outline" size={16} color="#999" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={[styles.rightSection, isCompact && styles.rightSectionCompact]}>
        {showSellerTools ? (
          <>
            <Pressable style={[styles.iconButton, isCompact && styles.iconButtonCompact]} onPress={() => router.push('/(main)/notifications')}>
              <IconSymbol name="bell.fill" size={18} color="#666666" />
              <View style={styles.notificationBadge} />
            </Pressable>

            <Pressable style={[styles.iconButton, isCompact && styles.iconButtonCompact]} onPress={() => router.push('/(main)/helpsupport')}>
              <Ionicons name="headset-outline" size={18} color="#666666" />
            </Pressable>

            <Pressable style={[styles.iconButton, isCompact && styles.iconButtonCompact]} onPress={() => router.push('/(main)/settingsModule')}>
              <Ionicons name="settings-outline" size={18} color="#666666" />
            </Pressable>
          </>
        ) : null}
        
        <View 
          // @ts-ignore
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={styles.avatarWrapper}
        >
          <Pressable style={[styles.avatar, isCompact && styles.avatarCompact]} onPress={() => router.push('/Profile')}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </Pressable>
          
          {isHovered && (
            <View style={styles.dropdownMenu}>
              <Pressable 
                onPress={handleLogout}
                // @ts-ignore
                style={({ hovered }) => [
                  styles.dropdownItem,
                  hovered && styles.dropdownItemHovered
                ]}
              >
                <Text style={[styles.dropdownText, { color: '#ef4444' }]}>Logout</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
      <SweetAlertHost />
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
    backdropFilter: 'blur(12px)',
    position: 'sticky' as any,
    top: 0,
    zIndex: 50,
    gap: 16,
    minWidth: 0,
  },
  containerNarrow: {
    gap: 8,
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
    flexShrink: 0,
  },
  searchContainer: {
    flex: 1,
    minWidth: 0,
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
  searchContainerNarrow: {
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontSize: 14,
    color: '#000',
    outlineStyle: 'none' as any,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingLeft: 4,
    marginLeft: 'auto' as any,
  },
  rightSectionCompact: {
    gap: 0,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    position: 'relative',
  },
  iconButtonCompact: {
    padding: 6,
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
  avatarCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  avatarWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 6,
    minWidth: 150,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  dropdownItemHovered: {
    backgroundColor: '#f3f4f6',
  },
  dropdownText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
});
