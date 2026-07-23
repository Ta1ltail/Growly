"use client";

// Daily spin — a simple wheel-of-fortune that gives a random reward once per
// day. The wheel spins with CSS animation and lands on a random segment.

import { useState, useRef, useEffect } from "react";
import { Sparkles, Coins, Snowflake, RotateCw, X } from "lucide-react";

import { doDailySpin, useAppDataSelector } from "@/lib/store";
import { dateKey } from "@/lib/date";
import { Button } from "@/components/ui/Button";
import { useScrollLock } from "@/hooks/useScrollLock";
import { SoundManager } from "@/lib/sound/SoundManager";

export function DailySpinModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const lastSpinDate = useAppDataSelector((d) => d.economy.lastSpinDate);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    label: string;
    amount: number;
    isFreeze: boolean;
  } | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive from reactive data so it updates properly
  const alreadySpun = lastSpinDate === dateKey(new Date());

  // Use centralized scroll lock
  useScrollLock(open);

  // Notify the back-button handler and bottom nav that this modal is open
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("modal:open"));
    return () => {
      window.dispatchEvent(new CustomEvent("modal:close"));
    };
  }, [open]);

  // Clean up spin timer on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current);
        spinTimerRef.current = null;
      }
    };
  }, []);

  function handleSpin() {
    if (spinning || alreadySpun) return;
    setSpinning(true);
    setResult(null);

    // Random spin (5-8 full rotations + random landing)
    const spinDeg = 1800 + Math.random() * 1080;
    setRotation((prev) => prev + spinDeg);

    // Wait for spin animation to finish, then get result
    spinTimerRef.current = setTimeout(() => {
      const reward = doDailySpin();
      if (reward) {
        setResult(reward);
      }
      setSpinning(false);
      spinTimerRef.current = null;
    }, 2500);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-line">
        <button
          onClick={() => {
            SoundManager.instance.play("button:modal-close");
            onClose();
          }}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted transition-colors hover:bg-surface2 hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <h2 className="mb-1 text-center text-lg font-bold">Daily Spin</h2>
        <p className="mb-5 text-center text-sm text-muted">
          {alreadySpun
            ? "You already spun today! Come back tomorrow."
            : "Spin the wheel for a chance to earn coins!"}
        </p>

        {/* Wheel */}
        <div className="relative mx-auto mb-6 flex size-56 items-center justify-center">
          {/* Pointer */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
            <div className="h-3 w-3 rotate-45 bg-accent shadow-lg" />
          </div>

          {/* Spinning wheel */}
          <div
            ref={wheelRef}
            className="size-52 rounded-full border-2 border-line transition-transform duration-[2500ms] ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(
                #fbbf24 0deg 40deg,
                #38bdf8 40deg 80deg,
                #34d399 80deg 120deg,
                #a78bfa 120deg 160deg,
                #fb7185 160deg 200deg,
                #22d3ee 200deg 240deg,
                #a3e635 240deg 280deg,
                #e879f9 280deg 320deg,
                #fb923c 320deg 360deg
              )`,
            }}
          >
            {/* Segments text overlay */}
            <div className="flex h-full items-center justify-center">
              {spinning ? (
                <RotateCw className="size-8 animate-spin text-white/60" />
              ) : result ? (
                <span className="text-3xl">
                  {result.isFreeze ? (
                    "❄️"
                  ) : (
                    <Coins className="size-8 text-amber-300" aria-hidden />
                  )}
                </span>
              ) : (
                <Sparkles className="size-8 text-accent" />
              )}
            </div>
          </div>
        </div>

        {/* Spin button */}
        {!alreadySpun && !spinning && !result && (
          <Button
            onClick={handleSpin}
            className="mx-auto block px-6 py-2.5 text-base"
          >
            <Sparkles className="size-4" aria-hidden />
            Spin!
          </Button>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 animate-pop text-center">
            <div className="mx-auto flex w-fit items-center gap-3 rounded-xl bg-accent/10 px-5 py-3">
              {result.isFreeze ? (
                <Snowflake className="size-6 text-sky-400" />
              ) : (
                <Coins className="size-6 text-amber-500" />
              )}
              <div>
                <p className="text-lg font-bold">{result.label}</p>
                <p className="text-xs text-muted">
                  {result.isFreeze
                    ? "You won a free Streak Freeze!"
                    : `+${result.amount} coins added to your balance`}
                </p>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" className="mt-3">
              Awesome!
            </Button>
          </div>
        )}

        {alreadySpun && !result && (
          <Button onClick={onClose} variant="ghost" className="mx-auto block">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
