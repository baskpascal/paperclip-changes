import { afterEach, describe, expect, it, vi } from "vitest";
import { execute } from "./execute.js";

describe("ollama execute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs a stateless Ollama chat request and reports summary", async () => {
    const onLog = vi.fn(async () => undefined);
    const onMeta = vi.fn(async () => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "qwen2.5-coder:7b",
        message: { content: "Done. Updated the task." },
        prompt_eval_count: 12,
        eval_count: 8,
      }),
    } as Response);

    const result = await execute({
      runId: "run-1",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Ollama Agent",
        adapterType: "ollama",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen2.5-coder:7b",
      },
      context: {
        taskTitle: "Fix the issue",
      },
      onLog,
      onMeta,
    });

    expect(result.exitCode).toBe(0);
    expect(result.provider).toBe("ollama");
    expect(result.model).toBe("qwen2.5-coder:7b");
    expect(result.summary).toContain("Done.");
    expect(onLog).toHaveBeenCalledWith("stdout", "Done. Updated the task.\n");
    expect(onMeta).toHaveBeenCalledTimes(1);
  });
});
