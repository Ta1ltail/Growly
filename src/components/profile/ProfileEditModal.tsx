"use client";

// Edit the character profile (spec §9 "Editable Profile"): display name,
// username, bio, motto, avatar (emoji preset or uploaded image), banner, and
// the showcased badge. Local draft state commits to the store via
// updateProfile on save — nothing here is derived, these are user-owned fields.

import { useState } from "react";
import { Upload } from "lucide-react";
import type { AchievementDef, Profile } from "@/lib/types";
import { updateProfile } from "@/lib/store";
import { AVATAR_PRESETS, BANNER_PRESETS, resolveAvatar } from "@/lib/cosmetics";
import { RARITY_STYLE } from "@/lib/rarity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

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

  // Re-seed the draft each time the modal opens so it reflects the latest save.
  const [seenOpen, setSeenOpen] = useState(false);
  if (open && !seenOpen) {
    setSeenOpen(true);
    setDraft(profile);
  } else if (!open && seenOpen) {
    setSeenOpen(false);
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("avatar", String(reader.result));
    reader.readAsDataURL(file);
  }

  function save() {
    updateProfile({
      displayName: draft.displayName.trim() || "Anonymous",
      username: draft.username.trim().replace(/^@/, "") || "user",
      bio: draft.bio?.trim() || undefined,
      motto: draft.motto?.trim() || undefined,
      avatar: draft.avatar,
      banner: draft.banner,
      showcaseBadgeId: draft.showcaseBadgeId,
    });
    onClose();
  }

  const uploaded = resolveAvatar(draft.avatar).kind === "image";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      subtitle="Your character page identity."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
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
                onChange={(e) => set("username", e.target.value)}
                maxLength={30}
                className={`${INPUT} pl-7`}
              />
            </div>
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
                  onClick={() => set("avatar", p.id)}
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
                  onClick={() => set("banner", b.id)}
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
