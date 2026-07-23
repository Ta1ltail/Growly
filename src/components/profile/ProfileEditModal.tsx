"use client";

// Edit the character profile (spec §9 "Editable Profile"): display name,
// username, bio, motto, avatar (emoji preset or uploaded image), banner, and
// the showcased badge. Local draft state commits to the store via
// updateProfile on save — nothing here is derived, these are user-owned fields.

import { useState } from "react";
import { Upload, AlertCircle } from "lucide-react";
import type { AchievementDef, Profile } from "@/lib/types";
import { updateProfile } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/supabase/storage";
import { AVATAR_PRESETS, BANNER_PRESETS, resolveAvatar } from "@/lib/cosmetics";
import { RARITY_STYLE } from "@/lib/rarity";
import { Modal } from "@/components/ui/Modal";
import { SoundManager } from "@/lib/sound/SoundManager";

export function ProfileEditModal({
  open,
  onClose,
  profile,
  unlockedDefs,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  unlockedDefs: AchievementDef[]; // candidates for the showcase badge
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Re-seed the draft each time the modal opens so it reflects the latest save.
  // Render-phase adjustment (React's "adjusting state when a prop changes"
  // pattern) — runs only on the open transition, never mid-edit.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(profile);
      setUsernameError(null);
    }
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Downscale + re-encode before storing. Avatars live in the profile blob
    // that's written to localStorage and pushed on every sync, so an unbounded
    // multi-MB data URL would blow the storage quota and bloat every payload.
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256; // px, longest edge
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          set("avatar", String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        set("avatar", canvas.toDataURL("image/jpeg", 0.85));
      };
      // If decoding fails, fall back to the original data URL.
      img.onerror = () => set("avatar", String(reader.result));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (saving) return; // guard against double-click race
    const newUsername = draft.username.trim().replace(/^@/, "").toLowerCase();
    if (!newUsername) {
      setUsernameError("Username is required.");
      return;
    }
    if (newUsername.length < 2) {
      setUsernameError("Username must be at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(newUsername)) {
      setUsernameError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    // Check if the username is already taken
    setSaving(true);
    setUsernameError(null);

    // Only check if username actually changed
    if (newUsername !== profile.username) {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("public_profiles")
        .select("username")
        .eq("username", newUsername)
        .maybeSingle();

      if (existing) {
        setUsernameError("This username is already taken. Try another one.");
        setSaving(false);
        return;
      }
    }

    let avatar = draft.avatar;

    // If the avatar is a data URL (freshly uploaded image), upload to
    // Supabase Storage and use the public URL. This replaces the old
    // Storage file automatically and avoids bloating the profile field.
    if (avatar && avatar.startsWith("data:")) {
      setUploadingAvatar(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          avatar = await uploadAvatar(user.id, avatar);
        }
      } catch (err) {
        console.warn("[profile] Avatar upload failed, falling back to data URL:", err);
        // Keep the data URL as-is — it still works, just won't have the
        // Storage benefits (deduplication, smaller profile payload).
      } finally {
        setUploadingAvatar(false);
      }
    }

    // Sanitize display name: strip control characters and invisible Unicode
    const cleanDisplayName = draft.displayName
      .trim()
      .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, "") // Control chars, line/paragraph separators
      .slice(0, 40) || "Anonymous";

    updateProfile({
      displayName: cleanDisplayName,
      username: newUsername,
      bio: draft.bio?.trim() || undefined,
      motto: draft.motto?.trim() || undefined,
      avatar,
      banner: draft.banner,
      showcaseBadgeId: draft.showcaseBadgeId,
    });
    setSaving(false);
    onClose();
  }

  const uploaded = resolveAvatar(draft.avatar).kind === "image";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      subtitle="Your character page identity."
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              SoundManager.instance.play("button:cancel");
              onClose();
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              SoundManager.instance.play("button:confirm");
              save();
            }}
            disabled={saving || uploadingAvatar}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <input
              value={draft.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              maxLength={40}
              className={INPUT}
            />
          </Field>
          <Field label="Username">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
                @
              </span>
              <input
                value={draft.username}
                onChange={(e) => {
                  set("username", e.target.value);
                  setUsernameError(null);
                }}
                maxLength={30}
                className={`${INPUT} pl-7`}
              />
            </div>
            {usernameError && (
              <p className="mt-1.5 text-xs text-missed flex items-center gap-1">
                <AlertCircle className="size-3" /> {usernameError}
              </p>
            )}
          </Field>
        </div>

        <Field label="Personal motto">
          <input
            value={draft.motto ?? ""}
            onChange={(e) => set("motto", e.target.value)}
            placeholder="Small improvements every day…"
            maxLength={120}
            className={INPUT}
          />
        </Field>

        <Field label="Bio">
          <textarea
            value={draft.bio ?? ""}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="A line or two about you."
            rows={3}
            maxLength={280}
            className={`${INPUT} resize-none`}
          />
        </Field>

        {/* Avatar */}
        <Field label="Avatar">
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((p) => {
              const active =
                !uploaded &&
                resolveAvatar(draft.avatar).kind === "glyph" &&
                draft.avatar === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    SoundManager.instance.play("button:click");
                    set("avatar", p.id);
                  }}
                  aria-label={p.id}
                  aria-pressed={active}
                  className={`grid size-11 place-items-center rounded-xl border text-xl transition-colors ${
                    active
                      ? "border-accent bg-accent/10"
                      : "border-line bg-surface2 hover:border-accent/40"
                  }`}
                >
                  {p.glyph}
                </button>
              );
            })}
            <label
              className={`flex size-11 cursor-pointer items-center justify-center rounded-xl border text-muted transition-colors hover:border-accent/40 hover:text-ink ${
                uploaded
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface2"
              }`}
              title="Upload an image"
            >
              <Upload className="size-4" />
              <input
                type="file"
                accept="image/*"
                onChange={onPickImage}
                className="hidden"
              />
            </label>
          </div>
        </Field>

        {/* Banner */}
        <Field label="Banner">
          <div className="flex flex-wrap gap-2">
            {BANNER_PRESETS.map((b) => {
              const active = (draft.banner ?? BANNER_PRESETS[0].id) === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    SoundManager.instance.play("button:click");
                    set("banner", b.id);
                  }}
                  aria-label={b.id}
                  aria-pressed={active}
                  className={`h-9 w-16 rounded-lg ring-2 ring-offset-2 ring-offset-surface transition-all ${
                    active ? "ring-accent" : "ring-transparent hover:ring-line"
                  }`}
                  style={{ background: b.gradient }}
                />
              );
            })}
          </div>
        </Field>

        {/* Showcase badge */}
        <Field label="Showcase badge">
          {unlockedDefs.length === 0 ? (
            <p className="text-xs text-faint">
              Unlock an achievement to feature it here.
            </p>
          ) : (
            <select
              value={draft.showcaseBadgeId ?? ""}
              onChange={(e) =>
                set("showcaseBadgeId", e.target.value || undefined)
              }
              className={INPUT}
            >
              <option value="">None</option>
              {unlockedDefs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name} · {RARITY_STYLE[d.rarity].label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
    </Modal>
  );
}

const INPUT =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
