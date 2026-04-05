import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOllamaModels, normalizeBaseUrl, resetModelCacheForTests } from "./models.js";
describe("ollama model discovery", () => {
    afterEach(() => {
        resetModelCacheForTests();
        vi.restoreAllMocks();
    });
    it("normalizes the configured base URL", () => {
        expect(normalizeBaseUrl("http://127.0.0.1:11434/")).toBe("http://127.0.0.1:11434");
    });
    it("discovers and normalizes Ollama models", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                models: [
                    { name: "qwen2.5-coder:7b" },
                    { model: "llama3.2:3b" },
                ],
            }),
        });
        await expect(fetchOllamaModels("http://127.0.0.1:11434")).resolves.toEqual([
            { id: "llama3.2:3b", label: "llama3.2:3b" },
            { id: "qwen2.5-coder:7b", label: "qwen2.5-coder:7b" },
        ]);
    });
});
//# sourceMappingURL=models.test.js.map