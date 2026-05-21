import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Colors, palette } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontFamilies } from "@/constants/fonts";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SellerLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isEmailFocused, setEmailFocused] = useState(false);
  const [isPasswordFocused, setPasswordFocused] = useState(false);

  const shouldHideFooter = isKeyboardVisible || isEmailFocused || isPasswordFocused;

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const validateEmail = (email: string) => {
    // Professional email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // Professional password validation
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`at least ${minLength} characters`);
    }
    if (!hasUpperCase) {
      errors.push("one uppercase letter");
    }
    if (!hasLowerCase) {
      errors.push("one lowercase letter");
    }
    if (!hasNumbers) {
      errors.push("one number");
    }
    if (!hasSpecialChar) {
      errors.push("one special character (!@#$%^&*)");
    }

    return { isValid: errors.length === 0, errors };
  };

  const validate = () => {
    // Reset error states
    setEmailError(false);
    setPasswordError(false);
    setPasswordErrors([]);

    let hasError = false;

    // Check if fields are empty
    if (!email.trim()) {
      setEmailError(true);
      setEmailErrorMessage("email or mobile number is required");
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError(true);
      setPasswordErrors(["Password is required"]);
      hasError = true;
    }

    // Enhanced email/mobile validation (only if email is not empty)
    if (email.trim()) {
      const val = email.trim();
      const isEmailFormat = val.includes("@");

      if (isEmailFormat) {
        if (!validateEmail(val)) {
          setEmailError(true);
          setEmailErrorMessage("enter valid email address");
          hasError = true;
        }
      } else {
        // Mobile validation
        let mobileVal = val;
        // Check for +91 or +91 prefix
        if (mobileVal.startsWith("+91 ")) {
          mobileVal = mobileVal.substring(4);
        } else if (mobileVal.startsWith("+91")) {
          mobileVal = mobileVal.substring(3);
        }

        const firstDigit = parseInt(mobileVal.charAt(0));
        const isValidStart = !isNaN(firstDigit) && firstDigit > 5;
        const isValidLength = mobileVal.length === 10;

        if (!isValidStart || !isValidLength) {
          setEmailError(true);
          setEmailErrorMessage("enter valid mobile number or email");
          hasError = true;
        }
      }
    }

    // Enhanced password validation (only if password is not empty)
    if (password.trim()) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setPasswordError(true);
        setPasswordErrors(passwordValidation.errors);
        hasError = true;
      }
    }

    return !hasError;
  };

  const handleLogin = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/(main)/dashboard");
    }, 1200);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      setEmailError(false);
      setEmailErrorMessage("");
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(false);
      setPasswordErrors([]);
    }
  };

  const goToRegister = () => router.push("/Register");

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.wrapper}
        >
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.header}>
              <LinearGradient
                colors={["#e96f43", "#376197"]}
                style={styles.faviconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Image
                  source={Platform.OS === 'web' ? require("../assets/images/logo-removebg-preview.png") : require("../assets/images/fav.png")}
                  style={styles.favicon}
                  resizeMode="contain"
                />
                <View style={styles.faviconOverlay} />
              </LinearGradient>
              <AppText size="xxl" weight="bold" align="center" style={styles.title}>Seller Account</AppText>
              <AppText align="center" color={Colors.light.textSecondary} style={styles.subtitle}>
                Hello, Welcome back to your account!
              </AppText>
            </View>

            <View style={styles.content}>
              <AppText weight="bold" color={Colors.light.textSecondary} style={styles.label}>
                Email or Mobile Number
              </AppText>
              <View
                style={[
                  styles.pillInputRow,
                  isDark && styles.pillInputRowDark,
                  emailError && styles.pillInputRowError,
                  isEmailFocused && styles.pillInputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="mail-outline"
                  size={18}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="Enter email or mobile number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="default"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    emailError && styles.inputError,
                    isEmailFocused && styles.inputFocused,
                  ]}
                />
              </View>

              {emailError && emailErrorMessage ? (
                <AppText size="xs" color={Colors.light.error} style={styles.errorText}>• {emailErrorMessage}</AppText>
              ) : null}

              <AppText weight="bold" color={Colors.light.textSecondary} style={[styles.label, { marginTop: spacing.md }]}>
                Password
              </AppText>
              <View
                style={[
                  styles.pillInputRow,
                  isDark && styles.pillInputRowDark,
                  passwordError && styles.pillInputRowError,
                  isPasswordFocused && styles.pillInputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={18}
                  color="#64748b"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    passwordError && styles.inputError,
                    isPasswordFocused && styles.inputFocused,
                  ]}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={passwordError ? "#ef4444c7" : (isPasswordFocused ? "#376197" : "#6b7280")}
                  />
                </Pressable>
              </View>

              {/* Password Error Messages */}
              {passwordError && passwordErrors.length > 0 && (
                <View style={styles.errorContainer}>
                  {passwordErrors.map((error, index) => (
                    <AppText key={index} size="xs" color={Colors.light.error} style={styles.errorText}>
                      • {error}
                    </AppText>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => router.push("/(auth)/forgotpassword")}
                style={styles.forgetWrap}
              >
                <AppText weight="bold" color={Colors.light.primary} style={styles.forget}>Forget Password?</AppText>
              </Pressable>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && styles.loginBtnPressed,
                  loading && { opacity: 0.8 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText size="lg" weight="bold" color={palette.white} style={styles.loginText}>Log In</AppText>
                )}
              </Pressable>

              <AppText align="center" color={Colors.light.textSecondary} style={styles.footerText}>
                Don&apos;t Have An Account?{" "}
                <AppText weight="bold" color={palette.warning} style={styles.signup} onPress={goToRegister}>
                  Sign Up
                </AppText>
              </AppText>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  backgroundGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0, // Extend beyond status bar to ensure full coverage
    bottom: 0,
  },
  root: { flex: 1 },
  safeArea: { flex: 1 },
  wrapper: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    justifyContent: "center",
  },
  card: {
    borderRadius: 0,
    padding: 20,
    paddingBottom: 20,
    marginHorizontal: 0,
    height: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    justifyContent: "space-between",
  },
  cardDark: { backgroundColor: "#0b1220" },
  header: { marginBottom: 12, alignItems: "center" },
  faviconContainer: {
    alignSelf: "center",
    marginTop: 32,
    marginBottom: 12,
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  favicon: {
    width: 100,
    height: 100,
    borderRadius: 50, // Perfect circle: half of width/height
    backgroundColor: "#ffffff",
  },
  faviconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50, // Match circle shape
    backgroundColor: "transparent", // Transparent to show favicon underneath
    // Left half orange, right half navy blue (vertical split)
    backgroundImage: "linear-gradient(90deg, #ff8c42 50%, #ff6b35 50%)",
  },
  title: {
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  content: { marginTop: spacing.md, flex: 1 },
  label: { fontSize: fontSizes.md, marginBottom: spacing.sm },
  pillInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.light.border,
    minHeight: 52,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  pillInputRowError: {
    borderColor: Colors.light.error,
    borderWidth: 2,
  },
  pillInputRowFocused: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  pillInputRowDark: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  input: { flex: 1, fontSize: fontSizes.sm, color: Colors.light.text, paddingVertical: 10, fontFamily: fontFamilies.regular },
  inputDark: { color: Colors.dark.text },
  inputError: { color: Colors.light.error },
  inputFocused: { color: Colors.light.primary },
  errorText: {
    marginTop: 2,
  },
  forgetWrap: { alignItems: "flex-end", marginTop: spacing.sm },
  forget: { fontSize: fontSizes.sm },
  loginBtn: {
    marginTop: spacing.lg,
    backgroundColor: Colors.light.primary,
    borderRadius: 36,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  loginBtnPressed: { transform: [{ scale: 0.995 }] },
  loginText: { fontSize: fontSizes.lg },
  footerText: { 
    fontSize: fontSizes.sm, 
    marginTop: spacing.md,
    marginBottom: 8 
  },
  signup: { fontSize: fontSizes.sm },
  eyeBtn: { padding: spacing.xs, position: 'absolute', right: spacing.md },
  errorContainer: { marginTop: spacing.xs, marginBottom: spacing.xs, paddingHorizontal: spacing.sm },
});
