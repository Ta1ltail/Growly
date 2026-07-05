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
import { clearLocalAppData } from "../lib/storage";
import { colors } from "../lib/colors";
import { Button } from "../components/ui/Button";

interface Props {
  onNavigateLogin?: () => void;
  onSuccess?: () => void;
}

export default function RegisterScreen({ onNavigateLogin, onSuccess }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    const supabase = createMobileClient();

    // Sign up
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim() || email.split("@")[0],
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("weak password")) {
        setError("Password is too weak. Use at least 6 characters with a mix of letters and numbers.");
      } else if (msg.includes("already registered") || msg.includes("user already exists")) {
        setError("An account with this email already exists.");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a moment.");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        setError("Connection error. Please check your internet.");
      } else if (msg.includes("invalid email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // Try signing in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // If sign-in fails, redirect to login
      onNavigateLogin?.();
      setLoading(false);
      return;
    }

    // Clear stale local data for the new account
    clearLocalAppData();
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
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: "700" }}>Get started</Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Create your account and start tracking today</Text>
        </View>

        <Text style={styles.label}>Display name (optional)</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.faint}
          autoComplete="name"
          editable={!loading}
          style={styles.input}
        />

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
          placeholder="At least 6 characters"
          placeholderTextColor={colors.faint}
          secureTextEntry
          autoComplete="new-password"
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
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Create account</Text>
          )}
        </Button>

        <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 20 }}>
          Already have an account?{' '}
          <Text style={{ color: colors.accent, fontWeight: "600" }} onPress={onNavigateLogin}>
            Sign in
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
