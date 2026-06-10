import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();

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
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerBtn} onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.registerText}>Register</Text>
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
    width: 250,
    height: 120,
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
    fontWeight: "bold",
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
    fontWeight: "bold",
  },
});