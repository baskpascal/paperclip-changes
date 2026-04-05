import type { AdapterModel } from "@paperclipai/adapter-utils";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_BASE_URL } from "../index.js";

const modelCache = new Map<string, { expiresAt: number; models: AdapterModel[] }>();
const MODELS_TTL_MS = 30_000;

export function normalizeBaseUrl(input: unknown): string {
  const raw = asString(input, DEFAULT_OLLAMA_BASE_URL).trim() || DEFAULT_OLLAMA_BASE_URL;
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported Ollama URL protocol: ${url.protocol}`);
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  const normalized = url.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function modelDiscoveryConfigFingerprint(config: Record<string, unknown>): string {
  return normalizeBaseUrl(config.baseUrl);
}

function modelLabelFromId(id: string): string {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : "Unknown model";
}

export async function fetchOllamaModels(baseUrl: string): Promise<AdapterModel[]> {
  const response = await fetch(`${baseUrl}/api/tags`, {
    method: "GET",
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama model discovery failed (${response.status}): ${body || response.statusText}`);
  }

  const payload = parseObject(await response.json());
  const rawModels = Array.isArray(payload.models) ? payload.models : [];
  const models = rawModels
    .map((entry) => parseObject(entry))
    .map((entry) => {
      const id = asString(entry.name, asString(entry.model, "")).trim();
      if (!id) return null;
      return {
        id,
        label: modelLabelFromId(id),
      } satisfies AdapterModel;
    })
    .filter((entry): entry is AdapterModel => entry !== null);

  return models.sort((a, b) => a.label.localeCompare(b.label));
}

export async function listModelsForConfig(config: Record<string, unknown>): Promise<AdapterModel[]> {
  const baseUrl = modelDiscoveryConfigFingerprint(config);
  const cached = modelCache.get(baseUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.models;
  const models = await fetchOllamaModels(baseUrl);
  modelCache.set(baseUrl, {
    expiresAt: Date.now() + MODELS_TTL_MS,
    models,
  });
  return models;
}

export async function listDefaultModels(): Promise<AdapterModel[]> {
  return listModelsForConfig({ baseUrl: DEFAULT_OLLAMA_BASE_URL });
}

export function resetModelCacheForTests(): void {
  modelCache.clear();
}
