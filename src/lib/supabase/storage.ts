"use client";

// Supabase Storage utilities for avatar management.
// Avatars are stored in the `avatars` bucket under `{userId}/avatar.jpg`.
// Old avatars are automatically deleted when a new one is uploaded.
// The avatar field in the profile stores the public URL of the uploaded file.

import { createClient } from "./client";

const AVATAR_BUCKET = "avatars";
const AVATAR_PATH = (userId: string) => `${userId}/avatar.jpg`;

/**
 * Get the Supabase Storage base URL for the current project.
 * Used to detect whether a profile.avatar value is a Storage URL (vs a preset id or data URL).
 */
function getStorageBaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectUrl = rawUrl.trim().replace(/\/$/, "");
  return `${projectUrl}/storage/v1/object/public/${AVATAR_BUCKET}/`;
}

/**
 * Check if a profile.avatar value refers to a file in Supabase Storage.
 */
function isStorageAvatar(avatar: string | undefined | null): boolean {
  if (!avatar) return false;
  return avatar.startsWith(getStorageBaseUrl());
}

/**
 * Upload an avatar image to Supabase Storage and return its public URL.
 * Automatically deletes any existing avatar for the same user.
 *
 * @param userId - The user's ID (used as the storage folder)
 * @param dataUrl - The resized avatar as a data URL (JPEG, max 256px)
 * @returns The public URL of the uploaded avatar
 */
export async function uploadAvatar(
  userId: string,
  dataUrl: string,
): Promise<string> {
  const supabase = createClient();

  // ── 1. Delete the old avatar if it exists in Storage ──
  await deleteAvatarFromStorage(userId).catch(() => {
    // Non-critical — old file may not exist
  });

  // ── 2. Convert data URL to Blob ──
  const blob = dataUrlToBlob(dataUrl);

  // ── 3. Upload new avatar ──
  const filePath = AVATAR_PATH(userId);
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: true, // Replace if exists (safety net for race conditions)
    });

  if (uploadError) {
    // Log a helpful message about creating the bucket in the Supabase dashboard.
    console.warn(
      `[storage] Upload failed. Ensure the "${AVATAR_BUCKET}" bucket exists ` +
      "in your Supabase dashboard (Storage > Create bucket > public, max 512 KB).",
    );
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  // ── 4. Get the public URL ──
  const { data: { publicUrl } } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete a user's avatar from Supabase Storage.
 * Only deletes if the current avatar is stored in Storage (not a preset or data URL).
 */
async function deleteAvatarFromStorage(
  userId: string,
  currentAvatarUrl?: string,
): Promise<void> {
  // If no specific URL provided, check if a file exists at the standard path
  if (currentAvatarUrl && !isStorageAvatar(currentAvatarUrl)) {
    return; // Not a Storage URL — nothing to delete
  }

  const supabase = createClient();
  const filePath = AVATAR_PATH(userId);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([filePath]);

  // Ignore "not found" errors — the file may not exist yet (first upload)
  if (error && !error.message?.includes("not found")) {
    console.warn("[storage] Failed to delete old avatar:", error.message);
  }
}

/**
 * Convert a data URL to a Blob suitable for upload.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const byteString = atob(dataUrl.split(",")[1] ?? "");
  const mimeString = dataUrl.split(",")[0]?.split(":")[1]?.split(";")[0] ?? "image/jpeg";
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}
