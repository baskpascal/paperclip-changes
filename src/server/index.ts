import { agentConfigurationDoc, label, type } from "../index.js";
import type { AdapterConfigSchemaCompat, ExtendedServerAdapterModule } from "./compat.js";
import { execute } from "./execute.js";
import { listDefaultModels, listModelsForConfig } from "./models.js";
import { testEnvironment } from "./test.js";

const configSchema: AdapterConfigSchemaCompat = {
  meta: {
    adapterRuntimeKind: "remote",
    modelFieldOwner: "schema",
    modelDiscoveryMode: "draft_config",
  },
  fields: [
    {
      key: "baseUrl",
      type: "text",
      label: "Base URL",
      default: "http://127.0.0.1:11434",
      hint: "Standard Ollama HTTP base URL",
      required: true,
    },
    {
      key: "model",
      type: "combobox",
      label: "Model",
      hint: "Discovered from the configured Ollama server",
      required: true,
      meta: {
        discoveryConfigKeys: ["baseUrl"],
      },
    },
    {
      key: "timeoutSec",
      type: "number",
      label: "Timeout (sec)",
      default: 300,
      hint: "Maximum time to wait for an Ollama response",
    },
  ],
};

export function createServerAdapter(): ExtendedServerAdapterModule {
  return {
    type,
    execute,
    testEnvironment,
    listModels: () => listDefaultModels(),
    listModelsForConfig,
    getConfigSchema: async () => configSchema,
    agentConfigurationDoc,
  };
}

export { label };
