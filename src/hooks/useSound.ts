"use client";

// React hook for the SoundManager. Reads settings from the store to determine
// enabled state and volume. Returns stable functions so it's safe to include
// in effect dependencies and pass as callbacks.

import { useCallback, useEffect, useRef } from "react";
import { SoundManager, type SoundEvent } from "@/lib/sound/SoundManager";
import { useAppDataSelector } from "@/lib/store";

/**
 * Hook that provides a `play` function for sound effects.
 *
 * Automatically respects the user's sound-enabled and volume settings from the
 * app store. The returned `play` function is stable (same reference across renders)
 * so it's safe as an effect dependency or prop.
 *
 * @example
 * ```tsx
 * const { play } = useSound();
 * return <button onClick={() => play("button:click")}>Click me</button>;
 * ```
 */
export function useSound() {
  const soundEnabled = useAppDataSelector(
    (d) => d.settings.soundEnabled ?? true,
  );
  const soundVolume = useAppDataSelector(
    (d) => d.settings.soundVolume ?? 0.5,
  );

  // Keep refs to avoid re-creating the play function when settings change.
  // The SoundManager reads its own internal state, so we just need to sync
  // settings when they change.
  const enabledRef = useRef(soundEnabled);
  const volumeRef = useRef(soundVolume);

  useEffect(() => {
    enabledRef.current = soundEnabled;
    SoundManager.instance.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    volumeRef.current = soundVolume;
    SoundManager.instance.setVolume(soundVolume);
  }, [soundVolume]);

  const play = useCallback((event: SoundEvent) => {
    SoundManager.instance.play(event);
  }, []);

  const preload = useCallback((event: SoundEvent) => {
    SoundManager.instance.preloadEvent(event);
  }, []);

  return { play, preload };
}
