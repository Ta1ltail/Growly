/**
 * SoundManager — centralized sound management singleton.
 *
 * Features:
 * - Single source of truth for all sound playback
 * - Volume control (0–1) with enable/disable
 * - Playback queue prevents overlapping (sequential FIFO)
 * - Deduplication: prevents replaying the same event within 500ms
 * - Lazy audio creation — no Audio objects for unused sounds
 * - Proper cleanup on dispose
 *
 * Usage (React components):
 *   import { useSound } from "@/hooks/useSound";
 *   const { play } = useSound();
 *   play("button:click");
 *
 * Usage (store modules / non-React code):
 *   import { SoundManager } from "@/lib/sound/SoundManager";
 *   SoundManager.instance.play("habit:complete");
 */

export type SoundEvent =
  | "achievement:unlock"
  | "achievement:celebrate"
  | "button:click"
  | "button:confirm"
  | "button:cancel"
  | "button:back"
  | "button:delete"
  | "button:toggle"
  | "button:modal-open"
  | "button:modal-close"
  | "habit:complete"
  | "habit:skip"
  | "habit:miss"
  | "reward:coin"
  | "reward:quest"
  | "reward:spin"
  | "reward:levelup"
  | "notification:generic"
  | "notification:friend"
  | "notification:reminder"
  | "streak:milestone"
  | "goal:complete";

/**
 * Priority determines queue position when multiple sounds fire rapidly.
 * HIGH: interrupts the queue immediately (achievements, level-ups)
 * MEDIUM: queued after HIGH sounds (rewards, habit marks, notifications)
 * LOW: queued last (button clicks, UI feedback)
 */
type Priority = "high" | "medium" | "low";

interface SoundConfig {
  path: string;
  priority: Priority;
}

const SOUND_MAP: Record<string, SoundConfig> = {
  // Achievement sounds
  "achievement:unlock": { path: "/sounds/achievement/unlock.mp3", priority: "high" },
  "achievement:celebrate": { path: "/sounds/achievement/unlock.mp3", priority: "high" },
  // Button sounds — all use click.mp3
  "button:click": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:confirm": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:cancel": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:back": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:delete": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:toggle": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:modal-open": { path: "/sounds/button/click.mp3", priority: "low" },
  "button:modal-close": { path: "/sounds/button/click.mp3", priority: "low" },
  // Habit status sounds
  "habit:complete": { path: "/sounds/habit/complete.mp3", priority: "medium" },
  "habit:skip": { path: "/sounds/habit/skip.mp3", priority: "medium" },
  "habit:miss": { path: "/sounds/habit/miss.mp3", priority: "medium" },
  // Reward sounds
  "reward:coin": { path: "/sounds/reward/coin.mp3", priority: "medium" },
  "reward:quest": { path: "/sounds/reward/coin.mp3", priority: "medium" },
  "reward:spin": { path: "/sounds/reward/coin.mp3", priority: "medium" },
  "reward:levelup": { path: "/sounds/reward/levelup.mp3", priority: "high" },
  // Notification sounds — all use click.mp3
  "notification:generic": { path: "/sounds/button/click.mp3", priority: "medium" },
  "notification:friend": { path: "/sounds/button/click.mp3", priority: "medium" },
  "notification:reminder": { path: "/sounds/button/click.mp3", priority: "medium" },
  // Streak milestone
  "streak:milestone": { path: "/sounds/achievement/unlock.mp3", priority: "high" },
  // Goal completed
  "goal:complete": { path: "/sounds/achievement/unlock.mp3", priority: "high" },
};

// ── Queue item ──

interface QueuedSound {
  event: SoundEvent;
  config: SoundConfig;
}

// ── Singleton ──

export class SoundManager {
  private static _instance: SoundManager;
  private _enabled = true;
  private _volume = 0.5;
  private _audioCache = new Map<string, HTMLAudioElement>();
  private _queue: QueuedSound[] = [];
  private _playing = false;
  private _recentlyPlayed = new Map<string, number>(); // event key → timestamp
  private readonly _dedupWindow = 500; // ms — prevents duplicate within 500ms
  private _disposed = false;

  private constructor() {
    // singleton
  }

  static get instance(): SoundManager {
    if (!SoundManager._instance) {
      SoundManager._instance = new SoundManager();
    }
    return SoundManager._instance;
  }

  // ── Public API ──

  /**
   * Play a sound event. Respects enable/disable and volume settings.
   * Deduplicates identical events within 500ms.
   * Queues sounds sequentially to prevent overlapping.
   */
  play(event: SoundEvent): void {
    if (this._disposed) return;
    if (!this._enabled) return;

    const config = SOUND_MAP[event];
    if (!config) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[SoundManager] Unknown sound event: "${event}"`);
      }
      return;
    }

    // Deduplication: skip if this exact event was played within the window.
    // HIGH priority sounds (achievements, level-ups, streak milestones, goals)
    // ALWAYS play — they are user-facing progression events that should never
    // be dropped. LOW/MEDIUM sounds (button clicks, rewards, notifications)
    // are deduped to prevent spam from rapid user interaction.
    const now = Date.now();
    if (config.priority !== "high") {
      const lastPlayed = this._recentlyPlayed.get(event);
      if (lastPlayed && now - lastPlayed < this._dedupWindow) {
        return;
      }
      this._recentlyPlayed.set(event, now);

      // Prune old dedup entries (keep last 50)
      if (this._recentlyPlayed.size > 50) {
        const keys = [...this._recentlyPlayed.keys()];
        for (const k of keys.slice(0, keys.length - 50)) {
          this._recentlyPlayed.delete(k);
        }
      }
    }

    // Add to queue
    this._queue.push({ event, config });

    // Sort queue by priority (high first, then medium, then low)
    this._queue.sort((a, b) => {
      const prioOrder = { high: 0, medium: 1, low: 2 };
      return prioOrder[a.config.priority] - prioOrder[b.config.priority];
    });

    // Process queue if not already playing
    if (!this._playing) {
      this._processQueue();
    }
  }

  /**
   * Set whether sound is enabled globally.
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    // If disabled, clear the queue and stop any current playback
    if (!enabled) {
      this._clearQueue();
    }
  }

  /**
   * Returns whether sound is currently enabled.
   */
  getEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Set volume (0 = silent, 1 = full).
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    // Update any cached Audio objects immediately
    for (const audio of this._audioCache.values()) {
      audio.volume = this._volume;
    }
  }

  /**
   * Returns current volume (0–1).
   */
  getVolume(): number {
    return this._volume;
  }

  /**
   * Preload all sound files into the audio cache.
   * Call once at app startup (e.g. in AppShell or root layout).
   */
  preload(): void {
    if (typeof window === "undefined") return;
    const uniquePaths = new Set(
      Object.values(SOUND_MAP).map((c) => c.path),
    );
    for (const path of uniquePaths) {
      if (!this._audioCache.has(path)) {
        const audio = new Audio(path);
        audio.preload = "auto";
        audio.volume = this._volume;
        // Trigger load
        audio.load();
        this._audioCache.set(path, audio);
      }
    }
  }

  /**
   * Preload a specific sound by event name (lazy preloading).
   */
  preloadEvent(event: SoundEvent): void {
    if (typeof window === "undefined") return;
    const config = SOUND_MAP[event];
    if (!config) return;
    if (this._audioCache.has(config.path)) return;
    const audio = new Audio(config.path);
    audio.preload = "auto";
    audio.volume = this._volume;
    audio.load();
    this._audioCache.set(config.path, audio);
  }

  /**
   * Dispose the SoundManager — releases all Audio objects and clears the queue.
   */
  dispose(): void {
    this._disposed = true;
    this._clearQueue();
    for (const audio of this._audioCache.values()) {
      audio.pause();
      audio.src = "";
    }
    this._audioCache.clear();
    this._recentlyPlayed.clear();
  }

  /**
   * Get or create an Audio element for a given path.
   * Uses lazy creation + caching for memory efficiency.
   */
  private _getAudio(path: string): HTMLAudioElement {
    let audio = this._audioCache.get(path);
    if (!audio) {
      audio = new Audio(path);
      audio.preload = "auto";
      audio.volume = this._volume;
      this._audioCache.set(path, audio);
    }
    return audio;
  }

  /**
   * Process the playback queue sequentially.
   */
  private _processQueue(): void {
    if (this._disposed) return;
    if (this._queue.length === 0) {
      this._playing = false;
      return;
    }

    this._playing = true;
    const item = this._queue.shift()!;

    try {
      const audio = this._getAudio(item.config.path);
      audio.volume = this._volume;

      // Set onended BEFORE calling play() to avoid a race condition where
      // very short audio files finish before the play promise resolves,
      // causing the queue to stall permanently.
      audio.onended = () => {
        if (!this._disposed) {
          this._processQueue();
        }
      };

      // Play the sound
      const playPromise = audio.play();

      // Handle the play promise (required for browsers that throw on failure)
      if (playPromise !== undefined) {
        playPromise.catch((error: DOMException) => {
          // Audio play was prevented (e.g., no user interaction yet).
          // Log in dev only to avoid console noise in production.
          if (
            process.env.NODE_ENV === "development" &&
            error.name !== "AbortError"
          ) {
            console.warn(
              `[SoundManager] Play prevented for "${item.event}":`,
              error.message,
            );
          }
          // Continue processing queue regardless
          if (!this._disposed) {
            this._processQueue();
          }
        });
      }
    } catch {
      // Any other error — continue queue processing
      if (!this._disposed) {
        this._processQueue();
      }
    }
  }

  /**
   * Clear the playback queue.
   */
  private _clearQueue(): void {
    this._queue = [];
    this._playing = false;
  }
}
