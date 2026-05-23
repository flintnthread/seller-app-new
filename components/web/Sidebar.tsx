import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: 'house.fill', iconColor: '#8B5CF6' },
  { name: 'Orders', path: '/Ordersscreen', icon: 'cube.box.fill', iconColor: '#3B82F6' },
  { name: 'Products', path: '/productmanagement', icon: 'bag.fill', iconColor: '#F59E0B' },
  { name: 'Colors', path: '/colors', icon: 'paintbrush.fill', iconColor: '#F28520' },
  { name: 'Sizes', path: '/sizes', icon: 'ruler.fill', iconColor: '#6366F1' },
  { name: 'Category Request', path: '/categoryrequest', icon: 'square.grid.2x2.fill', iconColor: '#14B8A6' },
  { name: 'Payments', path: '/payoutrequest', icon: 'cart.fill', iconColor: '#10B981' },
  { name: 'Profile', path: '/Profile', icon: 'person.crop.circle', iconColor: '#EC4899' },
] as const;

export function Sidebar() {
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
      </View>

      <View style={styles.navContainer}>
        {NAV_ITEMS.map((item) => {
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
  },
  logo: {
    height: 40,
    width: 180,
  },
  navContainer: {
    paddingHorizontal: 16,
    gap: 8,
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
