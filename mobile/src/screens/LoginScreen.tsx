import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { createMobileClient } from "../lib/supabase/client";
import { colors } from "../lib/colors";
import { Button } from "../components/ui/Button";

interface Props {
  onNavigateRegister?: () => void;
  onSuccess?: () => void;
}

export default function LoginScreen({ onNavigateRegister, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);

    const supabase = createMobileClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (msg.includes("email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        setError("Connection error. Please check your internet.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }
    // Successful login — notify parent
    onSuccess?.();
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        {/* Brand */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 24, color: "#fff", fontWeight: "700" }}>101</Text>
          </View>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "700" }}>Welcome back</Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Sign in to continue your streak</Text>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.faint}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
          style={styles.input}
        />

        {error && (
          <View style={{ backgroundColor: "rgba(244,63,94,0.1)", padding: 12, borderRadius: 12, marginBottom: 12 }}>
            <Text style={{ color: "#f43f5e", fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <Button onPress={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Sign in</Text>
          )}
        </Button>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 20 }}>
          Don't have an account?{' '}
          <Text style={{ color: colors.accent, fontWeight: "600" }} onPress={onNavigateRegister}>
            Create one
          </Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, maxWidth: 400, width: "100%", alignSelf: "center" },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#f1f5f9",
    fontSize: 15,
    marginBottom: 16,
  },
});
