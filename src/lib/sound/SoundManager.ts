/**
 * SoundManager — centralized sound management singleton.
 *
 * **Low-latency architecture:**
 * Uses Web Audio API (AudioContext) as the primary playback mechanism for
 * near-zero-latency (<10ms) audio. Falls back to HTMLAudioElement when
 * AudioContext is unavailable.
 *
 * On first call to `preload()` or `play()`, all sound files are fetched and
 * decoded into AudioBuffer objects stored in memory. Playback creates a
 * short-lived AudioBufferSourceNode from the pre-decoded buffer, which starts
 * virtually instantly — no file I/O or decode latency at play time.
 *
 * **Other guarantees:**
 * - Volume control (0–1) with enable/disable
 * - Priority queue prevents overlapping (sequential FIFO)
 * - Deduplication: medium/low priority events within 500ms are dropped
 * - HIGH priority events (achievements, level-ups) always play
 * - Lazy init — AudioContext is created on first use (browser policy)
 * - Memory-safe — buffers are decoded once, sources are GC'd after play
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

// SoundEvent type is derived from SOUND_MAP_ENTRIES keys below

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

// Derive the public SoundEvent type from the SOUND_MAP keys to keep them in sync.
export type SoundEvent = keyof typeof SOUND_MAP_ENTRIES;

const SOUND_MAP_ENTRIES = {
  // ── Achievement / Progression (high priority) ──
  "achievement:unlock": { path: "/sounds/achievement/sound_achievements.wav", priority: "high" },
  "achievement:celebrate": { path: "/sounds/achievement/sound_achievements.wav", priority: "high" },
  "streak:milestone": { path: "/sounds/achievement/sound_achievements.wav", priority: "high" },
  "goal:complete": { path: "/sounds/achievement/sound_achievements.wav", priority: "high" },
  "reward:levelup": { path: "/sounds/achievement/sound_levelup.wav", priority: "high" },

  // ── Button / UI clicks (low priority) ──
  "button:click": { path: "/sounds/button/click.wav", priority: "low" },
  "button:confirm": { path: "/sounds/button/confirm.wav", priority: "low" },
  "button:cancel": { path: "/sounds/button/cancel.wav", priority: "low" },
  "button:back": { path: "/sounds/button/back.wav", priority: "low" },
  "button:delete": { path: "/sounds/button/delete.wav", priority: "low" },
  "button:nav": { path: "/sounds/button/click.wav", priority: "low" },

  // ── Modal / Drawer (low priority) ──
  "button:modal-open": { path: "/sounds/ui/toggle-on.wav", priority: "low" },
  "button:modal-close": { path: "/sounds/ui/toggle-off.wav", priority: "low" },

  // ── Toggle / Switch (low priority) ──
  "button:toggle": { path: "/sounds/ui/toggle-on.wav", priority: "low" },

  // ── UI Feedback (medium priority) ──
  "ui:success": { path: "/sounds/ui/drop.wav", priority: "medium" },
  "ui:error": { path: "/sounds/ui/error.wav", priority: "medium" },
  "ui:warning": { path: "/sounds/ui/error.wav", priority: "medium" },

  // ── Habit status (medium priority) ──
  "habit:complete": { path: "/sounds/ui/drop.wav", priority: "medium" },
  "habit:skip": { path: "/sounds/button/back.wav", priority: "medium" },
  "habit:miss": { path: "/sounds/ui/error.wav", priority: "medium" },

  // ── Rewards (medium priority) ──
  "reward:coin": { path: "/sounds/reward/sound_coin.wav", priority: "medium" },
  "reward:quest": { path: "/sounds/reward/sound_coin.wav", priority: "medium" },
  "reward:spin": { path: "/sounds/reward/sound_coin.wav", priority: "medium" },
  "freeze:use": { path: "/sounds/button/confirm.wav", priority: "medium" },

  // ── Notifications (medium priority) ──
  "notification:generic": { path: "/sounds/notification/generic.wav", priority: "medium" },
  "notification:friend": { path: "/sounds/notification/friend.wav", priority: "medium" },
  "notification:reminder": { path: "/sounds/notification/generic.wav", priority: "medium" },

  // ── Note actions (low priority) ──
  "note:save": { path: "/sounds/button/click.wav", priority: "low" },
  "note:delete": { path: "/sounds/button/delete.wav", priority: "low" },
} satisfies Record<string, SoundConfig>;

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
  private _disposed = false;
  private _initAttempted = false;
  private _initResolved = false;

  // Web Audio API
  private _ctx: AudioContext | null = null;
  /** Pre-decoded audio buffers keyed by file path */
  private _buffers = new Map<string, AudioBuffer | null>();
  /** Pending decode promises keyed by file path (prevents duplicate fetches) */
  private _pendingDecodes = new Map<string, Promise<void>>();

  // HTMLAudioElement fallback cache (used when AudioContext is unavailable)
  private _audioCache = new Map<string, HTMLAudioElement>();

  // Queue
  private _queue: QueuedSound[] = [];
  private _playing = false;

  // Dedup
  private _recentlyPlayed = new Map<string, number>();
  private readonly _dedupWindow = 500; // ms

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
   * Deduplicates identical events within 500ms (except HIGH priority).
   * Queues sounds sequentially to prevent overlapping.
   */
  play(event: SoundEvent): void {
    if (this._disposed) return;
    if (!this._enabled) return;

    const config = SOUND_MAP_ENTRIES[event];
    if (!config) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[SoundManager] Unknown sound event: "${event}"`);
      }
      return;
    }

    // Deduplication: HIGH priority sounds (achievements, level-ups, etc.)
    // ALWAYS play. LOW/MEDIUM sounds are deduped to prevent spam.
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

    // Sort queue by priority (high first)
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
  }

  /**
   * Returns current volume (0–1).
   */
  getVolume(): number {
    return this._volume;
  }

  /**
   * Preload all sound files — fetches and decodes them into AudioBuffers.
   * Call once at app startup (e.g. in AppShell or root layout).
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  preload(): void {
    if (typeof window === "undefined") return;
    if (this._initAttempted) return;
    this._initAttempted = true;

    const uniquePaths = new Set(
      Object.values(SOUND_MAP_ENTRIES).map((c) => c.path),
    );

    // Try Web Audio API first
    this._tryInitAudioContext().then(() => {
      if (this._ctx) {
        // Decode all unique sound paths
        for (const path of uniquePaths) {
          this._ensureBuffer(path);
        }
      } else {
        // Fallback to HTMLAudioElement preloading
        for (const path of uniquePaths) {
          if (!this._audioCache.has(path)) {
            const audio = new Audio(path);
            audio.preload = "auto";
            audio.volume = this._volume;
            audio.load();
            this._audioCache.set(path, audio);
          }
        }
      }
    });
  }

  /**
   * Preload a specific sound by event name (lazy preloading).
   */
  preloadEvent(event: SoundEvent): void {
    if (typeof window === "undefined") return;
    const config = SOUND_MAP_ENTRIES[event];
    if (!config) return;

    if (this._ctx) {
      this._ensureBuffer(config.path);
    } else if (!this._audioCache.has(config.path)) {
      const audio = new Audio(config.path);
      audio.preload = "auto";
      audio.volume = this._volume;
      audio.load();
      this._audioCache.set(config.path, audio);
    }
  }

  /**
   * Dispose the SoundManager — releases all resources.
   */
  dispose(): void {
    this._disposed = true;
    this._clearQueue();
    this._buffers.clear();
    this._pendingDecodes.clear();
    this._recentlyPlayed.clear();
    for (const audio of this._audioCache.values()) {
      audio.pause();
      audio.src = "";
    }
    this._audioCache.clear();
    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
    }
    this._initAttempted = false;
    this._initResolved = false;
  }

  /**
   * Called by the Capacitor resume handler to reinitialize audio context
   * after the app resumes from background (AudioContext may be suspended).
   */
  resume(): void {
    if (this._ctx?.state === "suspended") {
      this._ctx.resume().catch(() => {});
    }
  }

  // ── Private: AudioContext init ──

  private async _tryInitAudioContext(): Promise<void> {
    if (this._initResolved) return;
    try {
      const Ctor = (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctor) {
        this._initResolved = true;
        return; // fallback to HTMLAudioElement
      }
      this._ctx = new Ctor();
      this._initResolved = true;

      // Handle autoplay policy: if context is suspended (no user interaction yet),
      // resume on the next user gesture. We can't force-resume here because
      // browsers require a user gesture. Sound playback triggered by a click
      // handler will naturally resume the context.
      if (this._ctx.state === "suspended") {
        const resumeHandler = () => {
          this._ctx?.resume().catch(() => {});
          document.removeEventListener("pointerdown", resumeHandler);
          document.removeEventListener("keydown", resumeHandler);
        };
        document.addEventListener("pointerdown", resumeHandler);
        document.addEventListener("keydown", resumeHandler);
      }
    } catch {
      this._initResolved = true; // fallback to HTMLAudioElement
    }
  }

  // ── Private: Buffer loading (Web Audio API) ──

  /**
   * Ensure a decoded AudioBuffer exists for the given path.
   * Uses a pending-decode map to prevent duplicate network requests.
   */
  private _ensureBuffer(path: string): void {
    if (this._buffers.has(path)) return; // already decoded (or failed)
    if (this._pendingDecodes.has(path)) return; // already fetching

    const promise = this._decodeAudio(path);
    this._pendingDecodes.set(path, promise);
    promise
      .then(() => {
        this._pendingDecodes.delete(path);
      })
      .catch(() => {
        this._pendingDecodes.delete(path);
        this._buffers.set(path, null); // mark as failed
      });
  }

  private async _decodeAudio(path: string): Promise<void> {
    if (!this._ctx) return;

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
      this._buffers.set(path, audioBuffer);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[SoundManager] Failed to decode "${path}":`, err);
      }
      this._buffers.set(path, null); // mark as failed
    }
  }

  // ── Private: Playback ──

  /**
   * Play a sound from a pre-decoded AudioBuffer via Web Audio API.
   * This is the low-latency path — creates a BufferSource from the
   * already-decoded buffer and connects it to the destination.
   *
   * Returns true if the buffer was played, false if it couldn't be.
   * Queue processing is handled by the source.onended callback so
   * sounds never overlap.
   */
  private _playBuffer(path: string): boolean {
    if (!this._ctx) return false;

    const buffer = this._buffers.get(path);
    if (!buffer) return false; // not decoded yet or failed

    try {
      const source = this._ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = this._ctx.createGain();
      gainNode.gain.value = this._volume;

      source.connect(gainNode);
      gainNode.connect(this._ctx.destination);

      source.start(0);

      // When the buffer finishes playing, process the next queued sound.
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        if (!this._disposed) {
          this._processQueue();
        }
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fallback playback via HTMLAudioElement (used when AudioContext
   * is unavailable or buffer decoding is pending/failed).
   */
  private _playElement(path: string): HTMLAudioElement {
    let audio = this._audioCache.get(path);
    if (!audio) {
      audio = new Audio(path);
      audio.preload = "auto";
      audio.volume = this._volume;
      this._audioCache.set(path, audio);
    } else {
      // Reset to beginning for replay
      audio.currentTime = 0;
    }
    audio.volume = this._volume;
    return audio;
  }

  /**
   * Process the playback queue sequentially.
   * Sounds never overlap — each sound plays to completion before the next
   * starts via the `onended` callback.
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
      // Try Web Audio API path first (low-latency, <10ms startup)
      const buffered = this._ctx && this._buffers.has(item.config.path);
      if (buffered && this._playBuffer(item.config.path)) {
        // Queue processing is handled by source.onended inside _playBuffer
        return;
      }

      // Fallback to HTMLAudioElement
      const audio = this._playElement(item.config.path);

      // Set onended to process next in queue
      audio.onended = () => {
        if (!this._disposed) {
          this._processQueue();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: DOMException) => {
          if (
            process.env.NODE_ENV === "development" &&
            error.name !== "AbortError"
          ) {
            console.warn(
              `[SoundManager] Play prevented for "${item.event}":`,
              error.message,
            );
          }
          if (!this._disposed) {
            this._processQueue();
          }
        });
        // Safety timeout: if onended doesn't fire (e.g., very short audio),
        // process the next item after a brief delay.
        playPromise.then(() => {
          setTimeout(() => {
            if (!this._disposed && this._playing && this._queue.length > 0) {
              this._processQueue();
            }
          }, 200);
        });
      }
    } catch {
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
