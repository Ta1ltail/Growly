"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  UserRound,
  Flame,
  Medal,
  ArrowLeft,
  Loader2,
  Trophy,
  CalendarDays,
  UserPlus,
  UserCheck,
  Target,
  Star,
  Clock,
  Award,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/lib/notifications";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
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
        .select("*")
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
        .select("*")
        .eq("user_id", profileData.user_id)
        .single();

      if (snap) setStats(snap as StatsSnapshot);

      // Check friend status
      if (currentUser && profileData.user_id !== currentUser.id) {
        // Check if they're friends
        const { data: friendRows } = await supabase
          .from("friends")
          .select("*")
          .or(
            `and(requester.eq.${currentUser.id},addressee.eq.${profileData.user_id}),and(requester.eq.${profileData.user_id},addressee.eq.${currentUser.id})`,
          );

        if (friendRows && friendRows.length > 0) {
          const accepted = friendRows.some((r: any) => r.status === "accepted");
          const pending = friendRows.some((r: any) => r.status === "pending");
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
            <UserRound className="size-10 text-faint" />
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

  return (
    <AppPageShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        {/* Back link */}
        <Link
          href="/friends"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to friends
        </Link>

        {/* ── Hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-b from-surface2/50 to-surface p-0">
            {/* Banner */}
            <div className="relative h-28 sm:h-36 overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: profile.banner
                    ? `linear-gradient(135deg, ${profile.banner} 0%, color-mix(in srgb, var(--c-accent) 40%, ${profile.banner}) 100%)`
                    : "linear-gradient(135deg, var(--c-accent) 0%, color-mix(in srgb, var(--c-accent) 60%, black) 100%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

              {/* Title badge on banner */}
              {stats && (
                <div className="absolute bottom-3 right-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm">
                  <span className="text-base leading-none">{stats.rank_icon}</span>
                  <span className="font-medium">{stats.title_name}</span>
                </div>
              )}
            </div>

            {/* Profile info */}
            <div className="relative px-5 pb-5">
              <div className="-mt-12 flex items-end gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-[3px] border-surface bg-gradient-to-br from-accent/20 to-surface2 text-accent shadow-lg shadow-black/20">
                  <UserRound className="size-10" />
                </div>
                <div className="mb-1 min-w-0 flex-1">
                  <h1 className="text-xl font-bold tracking-tight">
                    {profile.display_name}
                  </h1>
                  <p className="text-sm text-muted">@{profile.username}</p>

                  {stats && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                      <span className="flex items-center gap-1">
                        <Trophy className="size-3" /> Level {stats.level}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Award className="size-3" />{" "}
                        {stats.achievement_count} badge
                        {stats.achievement_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {profile.motto && (
                <p className="mt-3 text-sm italic text-muted/80">
                  &ldquo;{profile.motto}&rdquo;
                </p>
              )}

              {profile.bio && (
                <p className="mt-2 max-w-prose text-sm text-ink/80 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Friend request button */}
              {currentUser && !isMe && (
                <div className="mt-4">
                  {isFriend ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-done/10 px-4 py-2 text-sm font-semibold text-done">
                      <UserCheck className="size-4" /> Friends
                    </span>
                  ) : hasPendingRequest ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-500">
                      <Clock className="size-4" /> Request sent
                    </span>
                  ) : (
                    <Button
                      onClick={sendFriendRequest}
                      disabled={friendLoading}
                      size="md"
                    >
                      {friendLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      Add friend
                    </Button>
                  )}

                  {error && (
                    <p className="mt-2 text-xs text-missed">{error}</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* ── Stats grid ── */}
        {stats ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon={Trophy} value={stats.level} label="Level" accent />
              <StatCard icon={Flame} value={stats.current_streak} label="Current streak" />
              <StatCard icon={Medal} value={stats.best_streak} label="Best streak" />
              <StatCard icon={TrendingUp} value={`${stats.consistency_14d}%`} label="Consistency" />
              <StatCard icon={Target} value={stats.total_completions} label="Completions" />
            </div>
          </motion.div>
        ) : (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-4 animate-spin text-faint" />
              <p className="text-sm text-muted">
                This user hasn&apos;t synced their stats yet.
              </p>
            </div>
          </Card>
        )}

        {/* ── Achievement summary ── */}
        {stats && stats.achievement_count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent/10 text-xl">
                {stats.rank_icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{stats.title_name}</p>
                <p className="text-xs text-muted">
                  {stats.achievement_count} achievement
                  {stats.achievement_count !== 1 ? "s" : ""} unlocked
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-1.5">
                <Star className="size-3.5 text-amber-500" />
                <span className="text-xs font-semibold">Lv.{stats.level}</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Last active */}
        {stats && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-[10px] text-faint"
          >
            <CalendarDays className="mr-1 inline size-3" />
            Stats updated{" "}
            {new Date(stats.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </motion.p>
        )}
      </motion.div>
    </AppPageShell>
  );
}
