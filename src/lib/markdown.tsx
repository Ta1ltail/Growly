// Simple inline markdown renderer — handles bold, italic, code, links, lists,
// and headings. No library dependency. Returns an array of React nodes for
// use in any component that wants to render user-authored markdown.
//
// Usage:
//   import { renderMarkdown } from "@/lib/markdown";
//   <div>{renderMarkdown(body)}</div>

import type { ReactNode } from "react";

/** Render a full markdown string into React nodes (paragraphs, headings, lists, code blocks). */
export function renderMarkdown(text: string): ReactNode {
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
      const sizes = [
        "text-2xl",
        "text-xl",
        "text-lg",
        "text-base",
        "text-sm",
        "text-xs",
      ];
      return (
        <p key={pIdx} className={`${sizes[level - 1]} font-bold mt-2 mb-1`}>
          {content}
        </p>
      );
    }

    // Unordered list items
    if (/^[-*+]\s/.test(trimmed)) {
      const items = trimmed
        .split("\n")
        .filter((l) => /^[-*+]\s/.test(l.trim()));
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
      const items = trimmed
        .split("\n")
        .filter((l) => /^\d+\.\s/.test(l.trim()));
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
        <pre
          key={pIdx}
          className="my-1 overflow-x-auto rounded-lg bg-surface2 p-3 text-xs leading-relaxed"
        >
          <code>{code}</code>
        </pre>
      );
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={pIdx}
          className="my-1 border-l-2 border-accent pl-3 italic text-muted"
        >
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

/** Render inline markdown (bold, italic, code, links) within a text segment. */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
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
      parts.push(
        <code
          key={idx}
          className="rounded bg-surface2 px-1 py-0.5 text-xs font-mono"
        >
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch[0].length);
      idx++;
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
    if (linkMatch) {
      const url = linkMatch[2];
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
