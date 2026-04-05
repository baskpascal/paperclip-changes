import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_BASE_URL } from "../index.js";
import { listModelsForConfig, normalizeBaseUrl } from "./models.js";
function summarizeStatus(checks) {
    if (checks.some((check) => check.level === "error"))
        return "fail";
    if (checks.some((check) => check.level === "warn"))
        return "warn";
    return "pass";
}
export async function testEnvironment(ctx) {
    const checks = [];
    const config = parseObject(ctx.config);
    let baseUrl = DEFAULT_OLLAMA_BASE_URL;
    try {
        baseUrl = normalizeBaseUrl(config.baseUrl);
        checks.push({
            code: "ollama_base_url_valid",
            level: "info",
            message: `Configured Ollama server: ${baseUrl}`,
        });
    }
    catch (error) {
        checks.push({
            code: "ollama_base_url_invalid",
            level: "error",
            message: error instanceof Error ? error.message : "Invalid Ollama base URL",
            hint: `Use an absolute http(s) base URL, for example ${DEFAULT_OLLAMA_BASE_URL}`,
        });
        return {
            adapterType: ctx.adapterType,
            status: summarizeStatus(checks),
            checks,
            testedAt: new Date().toISOString(),
        };
    }
    const configuredModel = asString(config.model, "").trim();
    try {
        const models = await listModelsForConfig({ baseUrl });
        if (models.length === 0) {
            checks.push({
                code: "ollama_models_empty",
                level: "warn",
                message: "Ollama server responded but reported no installed models.",
                hint: "Pull at least one model with `ollama pull <model>` before running agents.",
            });
        }
        else {
            checks.push({
                code: "ollama_models_available",
                level: "info",
                message: `Ollama server reported ${models.length} model${models.length === 1 ? "" : "s"}.`,
            });
        }
        if (configuredModel) {
            if (models.some((entry) => entry.id === configuredModel)) {
                checks.push({
                    code: "ollama_model_available",
                    level: "info",
                    message: `Configured model available: ${configuredModel}`,
                });
            }
            else {
                checks.push({
                    code: "ollama_model_missing",
                    level: "error",
                    message: `Configured model is unavailable: ${configuredModel}`,
                    hint: "Choose one of the discovered Ollama models or pull the missing model first.",
                });
            }
        }
        else {
            checks.push({
                code: "ollama_model_unset",
                level: "warn",
                message: "No Ollama model selected yet.",
                hint: "Pick a discovered model before creating the agent.",
            });
        }
    }
    catch (error) {
        checks.push({
            code: "ollama_probe_failed",
            level: "error",
            message: error instanceof Error ? error.message : "Failed to reach the Ollama server",
            hint: "Verify the configured base URL is reachable from the Paperclip server host.",
        });
    }
    return {
        adapterType: ctx.adapterType,
        status: summarizeStatus(checks),
        checks,
        testedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=test.js.map