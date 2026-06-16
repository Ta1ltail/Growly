"use client";

import { useDevSettings, setAi } from "@/lib/devmode";
import { DevGroup, DevRow, DevStack, DevToggle, DEV_INPUT } from "../ui";

export const AI_TERMS =
  "ai settings model provider temperature max tokens streaming system prompt api key anthropic openai";

const PROVIDERS = ["anthropic", "openai", "google", "local"];

export function AiSettingsSection({ query }: { query: string }) {
  const { ai } = useDevSettings();

  return (
    <>
      <DevGroup title="Model">
        <DevRow label="Provider" query={query} terms="anthropic openai vendor">
          <select value={ai.provider} onChange={(e) => setAi({ provider: e.target.value })} className={`${DEV_INPUT} w-auto`}>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </DevRow>
        <DevStack label="Model ID" query={query} terms="name claude gpt">
          <input value={ai.model} onChange={(e) => setAi({ model: e.target.value })} className={`${DEV_INPUT} font-mono`} />
        </DevStack>
      </DevGroup>

      <DevGroup title="Generation">
        <DevStack label={`Temperature · ${ai.temperature.toFixed(2)}`} query={query} terms="randomness creativity">
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={ai.temperature}
            onChange={(e) => setAi({ temperature: Number(e.target.value) })}
            className="w-full accent-[var(--c-accent)]"
          />
        </DevStack>
        <DevStack label="Max tokens" query={query} terms="length limit">
          <input
            type="number"
            min={1}
            value={ai.maxTokens}
            onChange={(e) => setAi({ maxTokens: Number(e.target.value) })}
            className={DEV_INPUT}
          />
        </DevStack>
        <DevRow label="Streaming" hint="Stream tokens as they arrive." query={query} terms="sse">
          <DevToggle label="Streaming" checked={ai.streaming} onChange={(v) => setAi({ streaming: v })} />
        </DevRow>
      </DevGroup>

      <DevGroup title="Prompt & auth">
        <DevStack label="System prompt" query={query} terms="instructions">
          <textarea value={ai.systemPrompt} onChange={(e) => setAi({ systemPrompt: e.target.value })} rows={3} className={`${DEV_INPUT} resize-y`} />
        </DevStack>
        <DevStack label="API key" hint="Stored locally only — never sent anywhere." query={query} terms="secret token credential">
          <input type="password" value={ai.apiKey} onChange={(e) => setAi({ apiKey: e.target.value })} placeholder="sk-…" className={`${DEV_INPUT} font-mono`} />
        </DevStack>
      </DevGroup>

      <p className="px-1 text-[11px] leading-snug text-faint">
        No AI backend is wired into this app. These settings persist locally as a prototype surface only.
      </p>
    </>
  );
}
