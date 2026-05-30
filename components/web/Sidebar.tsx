import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, Alert, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStatus } from '@/hooks/useProfileStatus';
import { clearSellerId } from '@/lib/api/sellerSession';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isProfileCompleted } = useProfileStatus();

  // Dynamically define sections based on profile completion status
  const sections = isProfileCompleted
    ? [
        {
          title: 'GENERAL',
          items: [
            { name: 'Dashboard', path: '/dashboard', icon: 'house.fill' as const, iconColor: '#8B5CF6' },
          ],
        },
        {
          title: 'SELLER TOOLS',
          items: [
            { name: 'Products', path: '/productmanagement', icon: 'bag.fill' as const, iconColor: '#F59E0B' },
            { name: 'Orders', path: '/Ordersscreen', icon: 'cube.box.fill' as const, iconColor: '#3B82F6' },
            { name: 'Colors', path: '/colors', icon: 'paintbrush.fill' as const, iconColor: '#F28520' },
            { name: 'Sizes', path: '/sizes', icon: 'ruler.fill' as const, iconColor: '#6366F1' },
          ],
        },
        {
          title: 'SERVICES',
          items: [
            { name: 'Category Request', path: '/categoryrequest', icon: 'square.grid.2x2.fill' as const, iconColor: '#14B8A6' },
            { name: 'Payments', path: '/payoutrequest', icon: 'cart.fill' as const, iconColor: '#10B981' },
            { name: 'Support', path: '/helpsupport', icon: 'headphones' as const, iconColor: '#6366F1' },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { name: 'Profile', path: '/Profile', icon: 'person.crop.circle' as const, iconColor: '#EC4899' },
            { name: 'Logout', path: 'logout', icon: 'arrow.right.to.line' as const, iconColor: '#EF4444' },
          ],
        },
      ]
    : [
        {
          title: 'GENERAL',
          items: [
            { name: 'Dashboard', path: '/dashboard', icon: 'house.fill' as const, iconColor: '#8B5CF6' },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { name: 'Complete Profile', path: '/Profile', icon: 'person.crop.circle' as const, iconColor: '#EC4899' },
            { name: 'Logout', path: 'logout', icon: 'arrow.right.to.line' as const, iconColor: '#EF4444' },
          ],
        },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/logo-removebg-preview.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        {onClose && (
          <Pressable 
            onPress={onClose} 
            // @ts-ignore
            style={({ hovered }) => [
              styles.closeButton,
              hovered && { backgroundColor: '#f8fafc' }
            ]}
          >
            <Ionicons name="chevron-back" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.navContainer}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => {
                const isActive = pathname === item.path || pathname.includes(item.path) || (pathname === '/' && item.path === '/dashboard');
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => {
                      if (item.path === 'logout') {
                        if (Platform.OS === 'web') {
                          const confirmLogout = window.confirm("Are you sure you want to logout?");
                          if (confirmLogout) {
                            void clearSellerId();
                            router.replace("/(auth)/login");
                          }
                        } else {
                          Alert.alert("Logout", "Are you sure you want to logout?", [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Logout",
                              style: "destructive",
                              onPress: () => {
                                void clearSellerId();
                                router.replace("/(auth)/login");
                              },
                            },
                          ]);
                        }
                      } else if (item.name === 'Complete Profile') {
                        router.push("/(main)/sellerpersonalinfo");
                      } else {
                        router.push(item.path as any);
                      }
                    }}
                    // @ts-ignore
                    style={({ hovered }) => [
                      styles.navItem,
                      isActive && styles.navItemActive,
                      hovered && !isActive && styles.navItemHovered,
                    ]}
                  >
                    <IconSymbol 
                      name={item.icon} 
                      size={22} 
                      color={item.iconColor} 
                    />
                    <Text style={[
                      styles.navText,
                      isActive && styles.navTextActive
                    ]}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#eaeaea',
    height: '100%',
    paddingVertical: 24,
  },
  scrollContainer: {
    flex: 1,
  },
  logoContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    height: 40,
    width: 160,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  navContainer: {
    paddingHorizontal: 16,
    gap: 20,
  },
  sectionContainer: {
    width: '100%',
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionItems: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 14,
    transitionDuration: '150ms',
  },
  navItemActive: {
    backgroundColor: '#f3f4f6',
  },
  navItemHovered: {
    backgroundColor: '#f8fafc',
  },
  navText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#64748b',
  },
  navTextActive: {
    color: '#000000',
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
});
