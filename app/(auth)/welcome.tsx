import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { useAuthFlow } from "@/hooks/useAuthFlow";

export default function WelcomeScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { isDesktopAuthFlow, isMobileAuthFlow, initialAuthRoute, loginRoute } =
    useAuthFlow();

  const isPreLoginStep = from === "details";

  if (isDesktopAuthFlow) {
    return <Redirect href="/(auth)/details" />;
  }

  // Mobile/tablet: welcome is step 3 only (after details). Direct visits go to landing.
  if (isMobileAuthFlow && !isPreLoginStep) {
    return <Redirect href={initialAuthRoute} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/images/background.jpg")}
          style={styles.image}
          resizeMode="cover"
        />
        <Image
          source={require("../../assets/images/bg.png")}
          style={styles.chair}
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/images/fnt1.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push(loginRoute)}
        >
          <AppText style={styles.loginText}>Continue to Login</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => router.push("/(auth)/signup")}
        >
          <AppText style={styles.registerText}>Register</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageContainer: {
    flex: 2,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  logo: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    width: 300,
    height: 200,
  },
  bottomContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  chair: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: 500,
    height: 500,
  },
  loginBtn: {
    backgroundColor: "#ff6a00",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  loginText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  registerBtn: {
    borderWidth: 2,
    borderColor: "#ff6a00",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  registerText: {
    color: "#ff6a00",
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
});
