"use client";

// Profile mutations — domain logic extracted from index.ts

import { update } from "./core";
import type { Profile } from "../types";

/* ---------------- profile ---------------- */

export function updateProfile(patch: Partial<Profile>): void {
  update((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
}
