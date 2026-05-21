import React from 'react';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

export default function Index() {
  if (Platform.OS === 'web') {
    return <Redirect href="/(main)/dashboard" />;
  }
  return <Redirect href="/(auth)/landing" />;
}