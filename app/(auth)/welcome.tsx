import { router, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
  BackHandler,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";

export default function LoginScreen() {
  const navigation = useNavigation();


  return (
    <SafeAreaView style={styles.container}>

      {/* Top Image with Logo */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/images/background.jpg")}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Chair Image */}
        <Image
          source={require("../../assets/images/bg.png")}
          style={styles.chair}
          resizeMode="contain"
        />

        {/* Logo on Top */}
        <Image
          source={require("../../assets/images/fnt1.jpg")} // add your logo here
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/(auth)/login")}>
          <AppText style={styles.loginText}>Login</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerBtn} onPress={() => router.push("/(auth)/signup")}>
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

  // 🔥 Logo Style (Top Center)
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
  // 🔥 Chair positioning
  chair: {
    position: "absolute",
    bottom: 0,       // sits on curve
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
