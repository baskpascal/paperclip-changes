export const type = "ollama";
export const label = "Ollama";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

export const agentConfigurationDoc = `# ollama agent configuration

Adapter: ollama

Use when:
- You want Paperclip to run agents through a standard Ollama HTTP server
- You want to use locally downloaded or self-hosted Ollama models
- You want model discovery driven by the configured Ollama base URL

Don't use when:
- You need a built-in Paperclip adapter; this package is external-only
- You need provider-specific CLI/session resume behavior already implemented by local CLI adapters
- You do not have a reachable Ollama server exposing the standard HTTP API

Core fields:
- baseUrl (string, required): Ollama server base URL. Defaults to ${DEFAULT_OLLAMA_BASE_URL}
- model (string, required): model id available from the configured Ollama server
- promptTemplate (string, optional): system prompt template used for each run
- timeoutSec (number, optional): request timeout in seconds

Notes:
- v1 uses stateless /api/chat requests.
- Model discovery is driven by the configured base URL.
- If a model or server does not support multimodal input, the adapter degrades gracefully to text-only execution.
`;

export { createServerAdapter } from "./server/index.js";
