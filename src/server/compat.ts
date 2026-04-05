import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";

export interface AdapterConfigSchemaCompat {
  meta?: Record<string, unknown>;
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "select" | "toggle" | "number" | "textarea" | "combobox";
    options?: Array<{ label: string; value: string; group?: string }>;
    default?: unknown;
    hint?: string;
    required?: boolean;
    group?: string;
    meta?: Record<string, unknown>;
  }>;
}

export type ExtendedServerAdapterModule = ServerAdapterModule & {
  listModelsForConfig?: (config: Record<string, unknown>) => Promise<Array<{ id: string; label: string }>>;
  getConfigSchema?: () => Promise<AdapterConfigSchemaCompat> | AdapterConfigSchemaCompat;
};

export function joinPromptSections(sections: Array<string | null | undefined>, separator = "\n\n"): string {
  return sections
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(separator);
}

export function stringifyPaperclipWakePayload(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    const parsed = parseObject(value);
    if (Object.keys(parsed).length === 0) return null;
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

export function renderPaperclipWakePrompt(value: unknown): string {
  const payload = parseObject(value);
  if (Object.keys(payload).length === 0) return "";

  const issue = parseObject(payload.issue);
  const comments = Array.isArray(payload.comments) ? payload.comments.map((entry) => parseObject(entry)) : [];
  const lines: string[] = [
    "## Paperclip Wake Payload",
    "",
    `- reason: ${asString(payload.reason, "unknown") || "unknown"}`,
  ];

  const issueId = asString(issue.identifier, asString(issue.id, "unknown"));
  const issueTitle = asString(issue.title, "").trim();
  if (issueId || issueTitle) {
    lines.push(`- issue: ${issueId || "unknown"}${issueTitle ? ` ${issueTitle}` : ""}`);
  }

  if (comments.length > 0) {
    lines.push("", "Recent comments:");
    for (const [index, comment] of comments.entries()) {
      const body = asString(comment.body, "").trim();
      if (!body) continue;
      lines.push(`${index + 1}. ${body}`);
    }
  }

  return lines.join("\n").trim();
}
