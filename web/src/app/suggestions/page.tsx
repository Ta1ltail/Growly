"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lightbulb,
  Bug,
  Sparkles,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  ThumbsUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { cn } from "@/lib/util";

type SuggestionRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  status: string;
};

const CATEGORIES = [
  { id: "general", label: "General", icon: MessageSquare },
  { id: "feature", label: "Feature Request", icon: Sparkles },
  { id: "improvement", label: "Improvement", icon: ThumbsUp },
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "other", label: "Other", icon: Lightbulb },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-accent/10 text-accent" },
  read: { label: "Read", className: "bg-blue-500/10 text-blue-500" },
  acknowledged: {
    label: "Acknowledged",
    className: "bg-amber-500/10 text-amber-500",
  },
  completed: { label: "Completed", className: "bg-done/10 text-done" },
  declined: { label: "Declined", className: "bg-missed/10 text-missed" },
};

export default function SuggestionsPage() {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("suggestions")
      .select("id, title, body, category, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setSuggestions((data ?? []) as SuggestionRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;

    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.from("suggestions").insert({
      user_id: user.id,
      title: title.trim() || "Untitled",
      body: body.trim(),
      category,
    });

    if (err) {
      setError(err.message);
    } else {
      setSubmitted(true);
      setTitle("");
      setBody("");
      setCategory("general");
      loadSuggestions();
    }
    setSubmitting(false);
  };

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
        <PageHeader
          title="Suggestions"
          subtitle="Help us improve — share your ideas and feedback"
        />

        {/* Submit form */}
        <Card className="mb-6 p-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-12 text-done" />
              <h3 className="text-lg font-bold">Thank you!</h3>
              <p className="max-w-sm text-sm text-muted">
                Your feedback has been submitted. Every suggestion is read and
                helps shape the future of project_101.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category picker */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                        active
                          ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                          : "bg-surface2/60 text-muted hover:bg-surface2 hover:text-ink",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <div>
                <input
                  type="text"
                  placeholder="Brief title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Suggestion title"
                  className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Body */}
              <div>
                <textarea
                  placeholder="Describe your suggestion, idea, or bug report in detail…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  aria-label="Suggestion details"
                  className="w-full resize-none rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>

              {error && (
                <p className="text-xs font-medium text-missed">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit suggestion
              </button>
            </form>
          )}
        </Card>

        {/* Previous suggestions */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <MessageSquare className="size-4 icon-accent" /> Your suggestions
          </h2>

          {loading ? (
            <Card className="flex items-center justify-center p-8">
              <Loader2 className="size-5 animate-spin text-faint" />
            </Card>
          ) : suggestions.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-8 text-center">
              <Lightbulb className="size-10 text-faint" />
              <p className="text-sm text-muted">
                No suggestions yet. Share your first idea above!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => {
                const statusInfo =
                  STATUS_LABELS[s.status] ?? STATUS_LABELS.new;
                const CatIcon =
                  CATEGORIES.find((c) => c.id === s.category)?.icon ??
                  MessageSquare;
                return (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CatIcon className="size-4 text-muted shrink-0" />
                          <h3 className="text-sm font-semibold truncate">
                            {s.title || "Untitled"}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-muted line-clamp-3 whitespace-pre-wrap">
                          {s.body}
                        </p>
                        <p className="mt-2 text-[10px] text-faint">
                          {new Date(s.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                          statusInfo.className,
                        )}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
    </AppPageShell>
  );
}
