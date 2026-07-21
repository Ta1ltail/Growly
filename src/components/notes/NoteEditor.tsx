"use client";

// Note editor used inside a Modal. Supports body text, tags, and linking the
// note to a date, a habit, and/or a goal.

import { useState } from "react";
import { Check, Trash2, Eye, Edit3 } from "lucide-react";
import type { Habit, Goal, Note, NoteLinks } from "@/lib/types";

export interface NoteDraft {
  body: string;
  tags: string[];
  links: NoteLinks;
}

// Simple inline markdown renderer — handles bold, italic, code, links, lists,
// and headings. No library dependency. Returns plain text for unsupported syntax.
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split into paragraphs
  const paragraphs = text.split("\n\n");

  return paragraphs.map((para, pIdx) => {
    const trimmed = para.trim();

    // Headings: # through ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const content = renderInline(headingMatch[2]);
      const sizes = ["text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"];
      return (
        <p key={pIdx} className={`${sizes[level - 1]} font-bold mt-2 mb-1`}>
          {content}
        </p>
      );
    }

    // Unordered list items
    if (/^[-*+]\s/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^[-*+]\s/.test(l.trim()));
      return (
        <ul key={pIdx} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(item.replace(/^[-*+]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    // Ordered list items
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^\d+\.\s/.test(l.trim()));
      return (
        <ol key={pIdx} className="list-decimal list-inside space-y-0.5 my-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(item.replace(/^\d+\.\s+/, ""))}
            </li>
          ))}
        </ol>
      );
    }

    // Code block
    if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
      const code = trimmed.slice(3, -3).trim();
      return (
        <pre key={pIdx} className="my-1 overflow-x-auto rounded-lg bg-surface2 p-3 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
      );
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote key={pIdx} className="my-1 border-l-2 border-accent pl-3 italic text-muted">
          {renderInline(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      return <hr key={pIdx} className="my-2 border-line" />;
    }

    // Regular paragraph
    return (
      <p key={pIdx} className="text-sm leading-relaxed whitespace-pre-wrap">
        {renderInline(trimmed)}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // Split into segments of inline markdown
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={idx}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      idx++;
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<em key={idx}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      idx++;
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^`(.+?)`/);
    if (codeMatch) {
      parts.push(<code key={idx} className="rounded bg-surface2 px-1 py-0.5 text-xs font-mono">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      idx++;
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
    if (linkMatch) {
      const url = linkMatch[2];
      // Sanitize: only allow http, https, mailto, and relative URLs
      const sanitized =
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("mailto:") ||
        url.startsWith("/") ||
        url.startsWith("#")
          ? url
          : null;
      if (sanitized) {
        parts.push(
          <a
            key={idx}
            href={sanitized}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:brightness-110"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(linkMatch[0]);
      }
      remaining = remaining.slice(linkMatch[0].length);
      idx++;
      continue;
    }

    // Plain text up to next special char or end
    const nextSpecial = remaining.search(/[*[`]|\*\*/);
    if (nextSpecial === 0) {
      // Character matched but no valid pattern — emit it raw and advance 1
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else if (nextSpecial > 0) {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    } else {
      parts.push(remaining);
      remaining = "";
    }
    idx++;
  }

  return parts.length > 0 ? parts : text;
}

export function NoteEditor({
  initial,
  habits,
  goals,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Note;
  habits: Habit[];
  goals: Goal[];
  onSave: (draft: NoteDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [habitId, setHabitId] = useState(initial?.links.habitId ?? "");
  const [goalId, setGoalId] = useState(initial?.links.goalId ?? "");
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submit() {
    if (!body.trim()) return;
    onSave({
      body: body.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      links: {
        ...(initial?.links.date ? { date: initial.links.date } : {}),
        ...(habitId ? { habitId } : {}),
        ...(goalId ? { goalId } : {}),
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview toggle */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
          {preview ? "Preview" : "Body"}
        </label>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
          aria-label={preview ? "Edit mode" : "Preview mode"}
        >
          {preview ? (
            <><Edit3 className="size-3" /> Edit</>
          ) : (
            <><Eye className="size-3" /> Preview</>
          )}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[120px] rounded-xl border border-line bg-surface2 px-3.5 py-3 text-sm">
          {body.trim() ? renderMarkdown(body) : <span className="italic text-faint">Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a note… what happened, how you felt, what to change.\n\nSupports **bold**, *italic*, `code`, [links](url), lists, and headings."
          rows={6}
          aria-label="Note body"
          className="w-full resize-none rounded-xl border border-line bg-surface2 px-3.5 py-3 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Tags
        </label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma, separated, tags"
          aria-label="Tags"
          className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Link habit
          </label>
          <select
            value={habitId}
            onChange={(e) => setHabitId(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">None</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Link goal
          </label>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {onDelete ? (
          confirmDelete ? (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="text-muted">Delete note?</span>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg px-2.5 py-1.5 font-semibold text-missed transition-colors hover:bg-missed/10"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-2.5 py-1.5 font-medium text-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-missed transition-colors hover:bg-missed/10"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!body.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Check className="size-4" strokeWidth={2.5} /> Save note
          </button>
        </div>
      </div>
    </div>
  );
}
