"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  UserRound,
  Flame,
  Activity,
  Medal,
  ArrowLeft,
  Loader2,
  Trophy,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/lib/notifications";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
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
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);

  const username = params.username as string;

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Load public profile
      const { data: prof } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (!prof) {
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

      // Check if they're friends with the current user
      if (currentUser && profileData.user_id !== currentUser.id) {
        const { data: friendRows } = await supabase
          .from("friends")
          .select("*")
          .or(
            `and(requester.eq.${currentUser.id},addressee.eq.${profileData.user_id}),and(requester.eq.${profileData.user_id},addressee.eq.${currentUser.id})`,
          )
          .eq("status", "accepted");

        if (friendRows && friendRows.length > 0) setIsFriend(true);
      }

      setLoading(false);
    }

    load();
  }, [username, currentUser]);

  const sendFriendRequest = async () => {
    if (!currentUser || !profile) return;
    setFriendLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("friends").insert({
      requester: currentUser.id,
      addressee: profile.user_id,
    });

    if (error) {
      console.error("[friends] Failed to send request:", error.message);
    } else {
      setIsFriend(true);
      // Notify the addressee
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
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-faint" />
        </div>
      </AppPageShell>
    );
  }

  if (!profile) {
    return (
      <AppPageShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <UserRound className="size-16 text-faint" />
          <div>
            <h2 className="text-lg font-bold">User not found</h2>
            <p className="text-sm text-muted">
              No user with the username &ldquo;{username}&rdquo; exists.
            </p>
          </div>
          <Link
            href="/friends"
            className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            Back to friends
          </Link>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <div className="animate-fade-in">
        <Link
          href="/friends"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to friends
        </Link>

        {/* Profile card */}
        <Card className="mb-6 overflow-hidden p-0">
          {/* Banner */}
          <div
            className="relative h-24 sm:h-32"
            style={{
              background: profile.banner
                ? `linear-gradient(135deg, ${profile.banner}, color-mix(in srgb, var(--c-accent) 40%, ${profile.banner}))`
                : "linear-gradient(135deg, var(--c-accent), color-mix(in srgb, var(--c-accent) 60%, black))",
            }}
          />

          <div className="px-5 pb-5">
            <div className="-mt-10 flex items-end gap-4">
              <div className="flex size-20 items-center justify-center rounded-2xl border-4 border-surface bg-surface2 text-accent shadow-lg">
                <UserRound className="size-10" />
              </div>
              <div className="mb-1">
                <h1 className="text-xl font-bold">{profile.display_name}</h1>
                <p className="text-sm text-muted">@{profile.username}</p>
              </div>
            </div>

            {profile.motto && (
              <p className="mt-3 text-sm italic text-muted">
                &ldquo;{profile.motto}&rdquo;
              </p>
            )}

            {profile.bio && (
              <p className="mt-2 max-w-prose text-sm text-ink/80">
                {profile.bio}
              </p>
            )}

            {/* Friend button */}
            {currentUser && profile.user_id !== currentUser.id && (
              <div className="mt-4">
                {isFriend ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-done/10 px-4 py-2 text-sm font-semibold text-done">
                    <Activity className="size-4" /> Friends
                  </span>
                ) : (
                  <button
                    onClick={sendFriendRequest}
                    disabled={friendLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    {friendLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Add friend
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={Trophy}
              value={stats.level}
              label="Level"
              accent
            />
            <StatCard
              icon={Flame}
              value={stats.current_streak}
              label="Current streak"
            />
            <StatCard
              icon={Medal}
              value={stats.best_streak}
              label="Best streak"
            />
            <StatCard
              icon={Activity}
              value={`${stats.consistency_14d}%`}
              label="Consistency"
            />
            <StatCard
              icon={CalendarDays}
              value={stats.total_completions}
              label="Completions"
            />
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-muted">
            This user hasn&apos;t synced their stats yet.
          </Card>
        )}

        {/* Rank & achievement summary */}
        {stats && (
          <div className="mt-4">
            <Card className="flex items-center gap-4 p-4">
              <span className="text-2xl">{stats.rank_icon}</span>
              <div>
                <p className="text-sm font-semibold">{stats.title_name}</p>
                <p className="text-xs text-muted">
                  {stats.achievement_count} achievement
                  {stats.achievement_count !== 1 ? "s" : ""} unlocked
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Last active */}
        {stats && (
          <p className="mt-4 text-center text-[10px] text-faint">
            Stats updated{" "}
            {new Date(stats.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </AppPageShell>
  );
}
