import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { AppText } from "@/components/AppText";
import { Colors, palette } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontFamilies } from "@/constants/fonts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const Register = () => {
  const [agree, setAgree] = useState(false);
  const [otpMethod, setOtpMethod] = useState<"sms" | "call" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [emailError, setEmailError] = useState("");
  const router = useRouter();

  const navigateToLogin = () => {
    router.push("/login");
  };

  const validateEmail = (val: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(val);
  };

  const validateMobile = (val: string): string => {
    let mobileVal = val.trim();
    if (mobileVal.startsWith("+91 ")) mobileVal = mobileVal.substring(4);
    else if (mobileVal.startsWith("+91")) mobileVal = mobileVal.substring(3);
    const firstDigit = parseInt(mobileVal.charAt(0));
    if (isNaN(firstDigit) || firstDigit <= 5) return "Mobile number must start with a digit greater than 5";
    if (mobileVal.length !== 10) return "Mobile number must be 10 digits";
    return "";
  };

  const handleRegister = () => {
    if (!agree) return;

    // Validate mobile
    const mobileErr = validateMobile(mobile);
    if (mobileErr) { setMobileError(mobileErr); return; }
    setMobileError("");

    // Validate email
    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");

    if (!firstName || !lastName || !mobile || !email || !password) return;
    if (password !== confirmPassword) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace({
        pathname: "/(auth)/login",
        params: { email: email.trim(), fromSignup: "1" },
      });
    }, 1500);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require("../assets/images/logo-removebg-preview.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <AppText size="xl" weight="bold" style={styles.title}>Create Seller Account</AppText>

        {/* NAME */}
        <View style={styles.row}>
          <TextInput
            placeholder="First Name"
            placeholderTextColor="#9ca3af"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#9ca3af"
            style={[styles.input, { flex: 1 }]}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* MOBILE */}
        <TextInput
          placeholder="Mobile Number"
          placeholderTextColor="#9ca3af"
          style={[styles.input, mobileError ? styles.inputError : {}]}
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={(t) => { setMobile(t); setMobileError(""); }}
        />
        {mobileError ? <AppText size="xs" color={Colors.light.error} style={styles.fieldError}>{mobileError}</AppText> : null}

        {/* OTP OPTIONS */}
        <View style={styles.otpRow}>
          <TouchableOpacity
            style={[
              styles.otpOption,
              otpMethod === "sms" && styles.otpActive,
            ]}
            onPress={() => setOtpMethod("sms")}
          >
            <AppText
              weight="bold"
              color={otpMethod === "sms" ? palette.white : Colors.light.primary}
              style={styles.otpText}
            >
              SMS OTP
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.otpOption,
              otpMethod === "call" && styles.otpActive,
            ]}
            onPress={() => setOtpMethod("call")}
          >
            <AppText
              weight="bold"
              color={otpMethod === "call" ? palette.white : Colors.light.primary}
              style={styles.otpText}
            >
              Call OTP
            </AppText>
          </TouchableOpacity>
        </View>

        {/* EMAIL */}
        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#9ca3af"
          style={[styles.input, emailError ? styles.inputError : {}]}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(""); }}
        />
        {emailError ? <AppText size="xs" color={Colors.light.error} style={styles.fieldError}>{emailError}</AppText> : null}

        {/* PASSWORD */}
        <TextInput
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* TERMS */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgree(!agree)}
        >
          <View style={[styles.checkbox, agree && styles.checkboxActive]}>
            {agree && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <AppText size="sm" style={styles.termsText}>
            I agree to{" "}
            <AppText weight="bold" color={Colors.light.primary} style={styles.link}>Terms</AppText> &{" "}
            <AppText weight="bold" color={Colors.light.primary} style={styles.link}>Privacy Policy</AppText>
          </AppText>
        </TouchableOpacity>

        {/* BUTTON */}
        <TouchableOpacity
          style={[styles.button, (!agree || loading) && styles.buttonDisabled]}
          disabled={!agree || loading}
          onPress={handleRegister}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
          <AppText weight="bold" color={palette.white} style={styles.buttonText}>Register</AppText>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        <View style={styles.footer}>
          <AppText color={Colors.light.textSecondary} style={styles.footerText}>
            Already have an account?{" "}
          </AppText>
          <TouchableOpacity onPress={navigateToLogin}>
            <AppText weight="bold" color={Colors.light.primary} style={styles.link}>Sign in</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff7ed",
  },

  /* HEADER */
  header: {
    backgroundColor: "#ec945aa0",
    paddingTop: 130,
    paddingBottom: 30,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  /* FLOATING LOGO */
  logoWrapper: {
    position: "absolute",
    top: -1,
    padding: 10,
    borderRadius: 50,
  },

  logo: {
    width: 260,
    height: 130,
    marginTop: -1,
    borderRadius: 20,
  },

  brand: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: "#7c2d12",
    marginTop: 40,
  },

  /* CARD */
  card: {
    marginTop: -40,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#fff7ed",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  title: {
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    fontFamily: fontFamilies.regular,
  },
  otpText: {
    fontSize: fontSizes.sm,
  },
  termsText: {
    marginLeft: spacing.sm,
  },
  buttonText: {
    fontSize: fontSizes.md,
  },
  footerText: {
    fontSize: fontSizes.sm,
  },
  link: {
    fontSize: fontSizes.sm,
  },
  fieldError: {
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  otpRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  otpOption: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    alignItems: "center",
  },
  otpActive: {
    backgroundColor: Colors.light.primary,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.light.primary,
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: Colors.light.border,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
});
