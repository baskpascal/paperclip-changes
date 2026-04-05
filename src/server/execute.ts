import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asNumber,
  asString,
  buildPaperclipEnv,
  parseObject,
  renderTemplate,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_BASE_URL, type as adapterType } from "../index.js";
import {
  joinPromptSections,
  renderPaperclipWakePrompt,
  stringifyPaperclipWakePayload,
} from "./compat.js";
import { normalizeBaseUrl } from "./models.js";

type OllamaChatResponse = {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
};

function buildTaskPrompt(context: Record<string, unknown>): string {
  const taskTitle = asString(context.taskTitle, "").trim();
  const taskId = asString(context.taskId, "").trim();
  const issueId = asString(context.issueId, "").trim();
  const wakeReason = asString(context.wakeReason, "").trim();
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake);
  const generic = [
    taskTitle ? `Task title: ${taskTitle}` : null,
    taskId ? `Task id: ${taskId}` : null,
    issueId ? `Issue id: ${issueId}` : null,
    wakeReason ? `Wake reason: ${wakeReason}` : null,
    "Continue the assigned Paperclip work and return a concise, actionable result.",
  ]
    .filter(Boolean)
    .join("\n");
  return joinPromptSections([wakePrompt, generic]);
}

function summarizeAssistantText(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find(Boolean);
  return line ? line.slice(0, 280) : null;
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta } = ctx;
  const baseUrl = normalizeBaseUrl(config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL);
  const model = asString(config.model, "").trim();
  if (!model) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "Ollama adapter requires adapterConfig.model.",
      provider: "ollama",
      model: null,
    };
  }

  const timeoutSec = Math.max(5, asNumber(config.timeoutSec, 300));
  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.name}} ({{agent.id}}). Continue your Paperclip work for company {{agent.companyId}}.",
  );
  const renderedSystemPrompt = renderTemplate(promptTemplate, {
    agent,
    context,
    runId,
  });
  const userPrompt = buildTaskPrompt(parseObject(context));
  const wakePayloadJson = stringifyPaperclipWakePayload(context.paperclipWake);
  const env = buildPaperclipEnv(agent);

  await onMeta?.({
    adapterType,
    command: "ollama:http",
    cwd: process.cwd(),
    commandNotes: [`POST ${baseUrl}/api/chat`, `model=${model}`, `timeoutSec=${timeoutSec}`],
    env,
    prompt: joinPromptSections([renderedSystemPrompt, userPrompt]),
    context: {
      baseUrl,
      model,
      ...(wakePayloadJson ? { paperclipWakePayloadJson: wakePayloadJson } : {}),
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: renderedSystemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      await onLog("stderr", `${errorText || `Ollama request failed with HTTP ${response.status}`}\n`);
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: errorText || `Ollama request failed with HTTP ${response.status}`,
        provider: "ollama",
        model,
      };
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const assistantText = asString(payload.message?.content, "").trim();
    if (assistantText) {
      await onLog("stdout", `${assistantText}\n`);
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      provider: "ollama",
      model: asString(payload.model, model) || model,
      usage: {
        inputTokens: typeof payload.prompt_eval_count === "number" ? payload.prompt_eval_count : 0,
        outputTokens: typeof payload.eval_count === "number" ? payload.eval_count : 0,
      },
      resultJson: payload as Record<string, unknown>,
      summary: summarizeAssistantText(assistantText),
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    const message = timedOut
      ? `Ollama request timed out after ${timeoutSec}s.`
      : error instanceof Error
        ? error.message
        : "Unknown Ollama execution error";
    await onLog("stderr", `${message}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut,
      errorMessage: message,
      provider: "ollama",
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}
