import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useAppData } from "../lib/AppProvider";
import { createMobileClient } from "../lib/supabase/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { colors } from "../lib/colors";

const CATEGORIES = [
  { id: "general", label: "General", icon: "💬" },
  { id: "feature", label: "Feature", icon: "✨" },
  { id: "improvement", label: "Improvement", icon: "👍" },
  { id: "bug", label: "Bug Report", icon: "🐛" },
  { id: "other", label: "Other", icon: "💡" },
];

export default function SuggestionsScreen() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      const supabase = createMobileClient();
      await supabase.from("suggestions").insert({
        title: title.trim() || null,
        body: body.trim(),
        category,
      });
      setSubmitted(true);
      setTitle("");
      setBody("");
      setCategory("general");
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      // Silently fail — feedback submission is best-effort
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Suggestions" subtitle="Help us improve — share your ideas and feedback" />

      <Card style={{ padding: 20, marginBottom: 16 }}>
        {submitted ? (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
            <Text style={{ fontSize: 48 }}>✅</Text>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "700" }}>Thank you!</Text>
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
              Your feedback has been submitted!
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: category === cat.id ? `${colors.accent}4d` : "#334155", backgroundColor: category === cat.id ? `${colors.accent}1a` : "transparent" }}
                >
                  <Text style={{ color: category === cat.id ? colors.accent : colors.muted, fontSize: 12, fontWeight: "500" }}>
                    {cat.icon} {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Brief title (optional)"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />

            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Describe your suggestion…"
              placeholderTextColor={colors.faint}
              multiline
              numberOfLines={5}
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            />

            <Button onPress={handleSubmit} disabled={!body.trim() || saving}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>📤 Submit suggestion</Text>
            </Button>
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
    marginBottom: 12,
  },
});
