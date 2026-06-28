"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Flame,
  Medal,
  ArrowLeft,
  Loader2,
  Trophy,
  CalendarDays,
  UserPlus,
  UserCheck,
  Clock,
  Award,
  TrendingUp,
  Repeat,
  Sparkles,
  Gauge,
} from "lucide-react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/lib/notifications";
import { ACHIEVEMENTS, RARITY_ORDER, RARITY_LABEL } from "@/lib/achievements";
import { RARITY_STYLE } from "@/lib/rarity";
import { RANK_STYLE } from "@/lib/ranks";
import type { AchievementDef } from "@/lib/types";
import { resolveBanner } from "@/lib/cosmetics";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { RankAvatar } from "@/components/progression/RankAvatar";
import { TitleDisplay } from "@/components/progression/TitleDisplay";
import { titleForLevel } from "@/lib/titles";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/StaggerContainer";
import { AppPageShell } from "@/components/layout/AppPageShell";

type PublicProfile = {
  user_id: string;
  display_name: string;
  username: string;
  bio: string | null;
  motto: string | null;
  avatar: string | null;
  banner: string | null;
  showcase_badge_id: string | null;
};

type StatsSnapshot = {
  level: number;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  consistency_14d: number;
  achievement_count: number;
  title_name: string;
  rank_icon: string;
  updated_at: string;
};

export default function PublicProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = params.username as string;

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Load public profile
      const { data: prof, error: profErr } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, username, bio, motto, avatar, banner, showcase_badge_id")
        .eq("username", username)
        .single();

      if (profErr || !prof) {
        setError("User not found. They may have changed their username.");
        setLoading(false);
        return;
      }

      const profileData = prof as PublicProfile;
      setProfile(profileData);

      // If this is the current user's own profile, redirect them to /profile
      if (currentUser && profileData.user_id === currentUser.id) {
        window.location.href = "/profile";
        return;
      }

      // Load stats snapshot
      const { data: snap } = await supabase
        .from("user_stats_snapshots")
        .select("level, current_streak, best_streak, total_completions, consistency_14d, achievement_count, title_name, rank_icon, updated_at")
        .eq("user_id", profileData.user_id)
        .single();

      if (snap) setStats(snap as StatsSnapshot);

      // Load unlocked achievements
      const { data: unlocks } = await supabase
        .from("unlocks")
        .select("achievement_id")
        .eq("user_id", profileData.user_id);

      if (unlocks && unlocks.length > 0) {
        setUnlockedIds(
          new Set(
            (unlocks as { achievement_id: string }[]).map(
              (u) => u.achievement_id,
            ),
          ),
        );
      }

      // Check friend status
      if (currentUser && profileData.user_id !== currentUser.id) {
        const { data: friendRows } = await supabase
          .from("friends")
          .select("status")
          .or(
            `and(requester.eq.${currentUser.id},addressee.eq.${profileData.user_id}),and(requester.eq.${profileData.user_id},addressee.eq.${currentUser.id})`,
          );

        if (friendRows && friendRows.length > 0) {
          type FriendRow = { status: string };
          const accepted = (friendRows as FriendRow[]).some(
            (r) => r.status === "accepted",
          );
          const pending = (friendRows as FriendRow[]).some(
            (r) => r.status === "pending",
          );
          setIsFriend(accepted);
          setHasPendingRequest(pending);
        }
      }

      setLoading(false);
    }

    load();
  }, [username, currentUser]);

  const sendFriendRequest = async () => {
    if (!currentUser || !profile) return;
    setFriendLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: friendErr } = await supabase.from("friends").insert({
      requester: currentUser.id,
      addressee: profile.user_id,
    });

    if (friendErr) {
      if (friendErr.code === "23505") {
        setError("Friend request already sent or you're already friends.");
      } else {
        setError(friendErr.message);
      }
    } else {
      setHasPendingRequest(true);
      await createNotification({
        userId: profile.user_id,
        type: "friend_request",
        title: `${currentUser.user_metadata?.display_name ?? currentUser.email ?? "Someone"} sent you a friend request!`,
        body: "Tap to respond",
        fromUser: currentUser.id,
        link: "/friends",
      });
    }
    setFriendLoading(false);
  };

  // Compute unlocked achievements
  const unlockedDefs = useMemo<AchievementDef[]>(() => {
    return ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).sort(
      (a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity],
    );
  }, [unlockedIds]);

  // Showcase badge
  const showcaseBadge = useMemo(() => {
    if (!profile?.showcase_badge_id) return null;
    return (
      unlockedDefs.find((d) => d.id === profile!.showcase_badge_id) ?? null
    );
  }, [profile, unlockedDefs]);

  const bestAchievement = unlockedDefs[0] ?? null;

  // Title info from stats
  const titleInfo = useMemo(() => {
    if (!stats) return null;
    return titleForLevel(stats.level);
  }, [stats]);

  if (loading) {
    return (
      <AppPageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-faint" />
            <p className="text-sm text-muted">Loading profile&hellip;</p>
          </div>
        </div>
      </AppPageShell>
    );
  }

  if (!profile || error) {
    return (
      <AppPageShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center"
        >
          <div className="flex size-20 items-center justify-center rounded-2xl bg-surface2">
            <Trophy className="size-10 text-faint" />
          </div>
          <div>
            <h2 className="text-lg font-bold">User not found</h2>
            <p className="mt-1 text-sm text-muted">
              No user with the username &ldquo;{username}&rdquo; exists.
            </p>
          </div>
          <Link
            href="/friends"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            <ArrowLeft className="size-4" /> Back to friends
          </Link>
        </motion.div>
      </AppPageShell>
    );
  }

  const isMe = currentUser && profile.user_id === currentUser.id;
  const banner = resolveBanner(profile.banner ?? undefined);
  const rank = titleInfo ? RANK_STYLE[titleInfo.current.rank] : null;

  return (
    <AppPageShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="animate-fade-in"
      >
        {/* Back link */}
        <Link
          href="/friends"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Back to friends
        </Link>

        {/* ---- Hero / banner ---- */}
        {/* Mirrors the structure of /profile exactly: avatar overlapping the
            banner on the left, level chip beside it, then a stacked name /
            username / title / motto / bio block underneath. The friend
            action lives in the same top-right banner slot the Edit button
            uses on the own-profile page, instead of floating below the card. */}
        <Card className="mb-6 overflow-hidden p-0">
          <div className="relative h-28 sm:h-36" style={{ background: banner }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {currentUser && !isMe && (
              <div className="absolute right-3 top-3">
                {isFriend ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    <UserCheck className="size-3.5" /> Friends
                  </span>
                ) : hasPendingRequest ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    <Clock className="size-3.5" /> Request sent
                  </span>
                ) : (
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={sendFriendRequest}
                    disabled={friendLoading}
                    className="bg-black/30 text-white backdrop-blur-sm hover:bg-black/45"
                  >
                    {friendLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="size-3.5" />
                    )}
                    Add friend
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-12 flex items-end gap-4">
              {titleInfo ? (
                <RankAvatar
                  rank={titleInfo.current.rank}
                  avatar={profile.avatar ?? undefined}
                  size={88}
                />
              ) : (
                <div className="flex size-[88px] shrink-0 items-center justify-center rounded-2xl border-[3px] border-surface bg-gradient-to-br from-accent/20 to-surface2 text-accent shadow-lg shadow-black/20">
                  <Trophy className="size-10" />
                </div>
              )}
              {stats && (
                <div className="mb-1 flex items-center gap-2 font-mono text-sm font-bold">
                  <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent">
                    {stats.level}
                  </span>
                  <span className="text-muted">LVL</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {profile.display_name}
              </h1>
              <p className="text-sm text-muted">@{profile.username}</p>
              {titleInfo && (
                <TitleDisplay title={titleInfo} size="md" className="mt-2.5" />
              )}
              {profile.motto && (
                <p className="mt-2 text-sm italic text-muted">
                  &ldquo;{profile.motto}&rdquo;
                </p>
              )}
              {profile.bio && (
                <p className="mt-2 max-w-prose text-sm text-ink/90">
                  {profile.bio}
                </p>
              )}

              {error && <p className="mt-2 text-xs text-missed">{error}</p>}
            </div>
          </div>
        </Card>

        {/* ── Stats grid ── */}
        {stats ? (
          <>
            <Card className="mb-6 p-5">
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent/15 font-mono text-sm font-bold text-accent">
                    {stats.level}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Level
                  </span>
                </div>
                <span className="font-mono text-xs text-faint">
                  {stats.total_completions.toLocaleString()} total completions
                </span>
              </div>
              <ProgressBar value={stats.consistency_14d} />
              <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted">
                <span className="font-mono">
                  {stats.achievement_count} badge
                  {stats.achievement_count !== 1 ? "s" : ""}
                </span>
                {titleInfo?.next && (
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3 text-accent" />
                    Next title: {titleInfo.next.name} (Lv.
                    {titleInfo.next.minLevel})
                  </span>
                )}
              </div>
            </Card>

            <StaggerContainer className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StaggerItem>
                <StatCard
                  icon={Medal}
                  value={`${stats.achievement_count}`}
                  label="Badges"
                  accent
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={Trophy}
                  value={stats.achievement_count}
                  label="Achievements"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={Flame}
                  value={stats.current_streak}
                  label="Current streak"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={Award}
                  value={stats.best_streak}
                  label="Longest streak"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={TrendingUp}
                  value={`${stats.consistency_14d}%`}
                  label="Consistency"
                />
              </StaggerItem>
            </StaggerContainer>
          </>
        ) : (
          <Card className="mb-6 p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-4 animate-spin text-faint" />
              <p className="text-sm text-muted">
                This user hasn&apos;t synced their stats yet.
              </p>
            </div>
          </Card>
        )}

        {/* ── Showcase ── */}
        {stats && (
          <Card className="mb-6 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Showcase
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Favorite badge</span>
                {showcaseBadge ? (
                  <BadgeChip def={showcaseBadge} />
                ) : (
                  <span className="text-xs text-faint">
                    {unlockedDefs.length > 0
                      ? "None selected"
                      : "No badges yet"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Best achievement</span>
                {bestAchievement ? (
                  <BadgeChip def={bestAchievement} />
                ) : (
                  <span className="text-xs text-faint">None yet</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Current title</span>
                {titleInfo && rank ? (
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: rank.accent }}
                  >
                    <span aria-hidden>{rank.icon}</span>{" "}
                    {titleInfo.current.name}
                  </span>
                ) : (
                  <span className="text-xs text-faint">—</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Longest streak</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Flame className="size-4 text-orange-500" />{" "}
                  {stats.best_streak} days
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Total completions</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Repeat className="size-4 text-accent" />{" "}
                  {stats.total_completions.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* ── Badge gallery ── */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Badge collection
            </h2>
            <span className="text-xs font-semibold text-accent">
              {unlockedDefs.length} of {ACHIEVEMENTS.length}
            </span>
          </div>
          {unlockedDefs.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">
              No badges unlocked yet.
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex flex-wrap gap-3">
                {unlockedDefs.map((def) => (
                  <div
                    key={def.id}
                    title={`${def.name} · ${RARITY_LABEL[def.rarity]}`}
                  >
                    <AchievementBadge
                      def={def}
                      size={56}
                      shine={def.rarity === "legendary"}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* ── Stats panels ── */}
        {stats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {/* Consistency overview */}
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Consistency
              </h2>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">14-day consistency</span>
                    <span className="font-mono font-bold">
                      {stats.consistency_14d}%
                    </span>
                  </div>
                  <ProgressBar value={stats.consistency_14d} />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">Current streak</span>
                    <span className="font-mono font-bold">
                      {stats.current_streak}d
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      stats.best_streak > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (stats.current_streak / stats.best_streak) * 100,
                            ),
                          )
                        : 0
                    }
                    color="#f97316"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-surface2/50 p-3">
                  <Gauge
                    className="size-5 shrink-0"
                    style={{ color: rank?.accent ?? "var(--c-accent)" }}
                  />
                  <div className="text-xs text-muted">
                    <span className="font-semibold text-ink">
                      {stats.title_name}
                    </span>
                    {" · "}Best streak: {stats.best_streak}d
                  </div>
                </div>
              </div>
            </Card>

            {/* Achievement breakdown */}
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Achievement Breakdown
              </h2>
              <div className="flex flex-col gap-3">
                {(["common", "rare", "epic", "legendary"] as const).map(
                  (rarity) => {
                    const style = RARITY_STYLE[rarity];
                    const total = ACHIEVEMENTS.filter(
                      (a) => a.rarity === rarity,
                    ).length;
                    const unlocked = ACHIEVEMENTS.filter(
                      (a) => a.rarity === rarity && unlockedIds.has(a.id),
                    ).length;
                    const pct =
                      total > 0 ? Math.round((unlocked / total) * 100) : 0;
                    return (
                      <div key={rarity}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span aria-hidden>{style.medal}</span>
                            {RARITY_LABEL[rarity]}
                          </span>
                          <span className="font-mono text-muted">
                            {unlocked}/{total}
                          </span>
                        </div>
                        <ProgressBar value={pct} color={style.accent} />
                      </div>
                    );
                  },
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Last active */}
        {stats && (
          <p className="mt-2 text-center font-mono text-[10px] text-faint">
            <CalendarDays className="mr-1 inline size-3" />
            Stats updated{" "}
            {new Date(stats.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </motion.div>
    </AppPageShell>
  );
}

function BadgeChip({ def }: { def: AchievementDef }) {
  const r = RARITY_STYLE[def.rarity];
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${r.accent}1f`, color: r.accent }}
    >
      <span aria-hidden>{def.icon}</span> {def.name}
    </span>
  );
}
