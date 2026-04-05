import { afterEach, describe, expect, it, vi } from "vitest";
import { testEnvironment } from "./test.js";

describe("ollama testEnvironment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails invalid base URLs", async () => {
    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "ollama",
      config: { baseUrl: "ftp://example.com" },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.some((check) => check.code === "ollama_base_url_invalid")).toBe(true);
  });

  it("passes when the configured model exists", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "qwen2.5-coder:7b" }] }),
    } as Response);

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "ollama",
      config: { baseUrl: "http://127.0.0.1:11434", model: "qwen2.5-coder:7b" },
    });

    expect(result.status).toBe("pass");
    expect(result.checks.some((check) => check.code === "ollama_model_available")).toBe(true);
  });
});
