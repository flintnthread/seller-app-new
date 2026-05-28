import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="landing"
    >
      <Stack.Screen name="details" />
      <Stack.Screen name="landing" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgotpassword" />
      <Stack.Screen name="resetpassword" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="check-email" />
    </Stack>
  );
}
