import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS = [
  {
    title: 'GENERAL',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: 'house.fill', iconColor: '#8B5CF6' },
    ],
  },
  {
    title: 'SELLER TOOLS',
    items: [
      { name: 'Products', path: '/productmanagement', icon: 'bag.fill', iconColor: '#F59E0B' },
      { name: 'Orders', path: '/Ordersscreen', icon: 'cube.box.fill', iconColor: '#3B82F6' },
      { name: 'Colors', path: '/colors', icon: 'paintbrush.fill', iconColor: '#F28520' },
      { name: 'Sizes', path: '/sizes', icon: 'ruler.fill', iconColor: '#6366F1' },
    ],
  },
  {
    title: 'SERVICES',
    items: [
      { name: 'Category Request', path: '/categoryrequest', icon: 'square.grid.2x2.fill', iconColor: '#14B8A6' },
      { name: 'Payments', path: '/payoutrequest', icon: 'cart.fill', iconColor: '#10B981' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { name: 'Profile', path: '/Profile', icon: 'person.crop.circle', iconColor: '#EC4899' },
    ],
  },
] as const;

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

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

      <View style={styles.navContainer}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => {
                const isActive = pathname === item.path || pathname.includes(item.path) || (pathname === '/' && item.path === '/dashboard');
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => router.push(item.path as any)}
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
      </View>
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
