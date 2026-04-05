import type { AdapterModel } from "@paperclipai/adapter-utils";
export declare function normalizeBaseUrl(input: unknown): string;
export declare function modelDiscoveryConfigFingerprint(config: Record<string, unknown>): string;
export declare function fetchOllamaModels(baseUrl: string): Promise<AdapterModel[]>;
export declare function listModelsForConfig(config: Record<string, unknown>): Promise<AdapterModel[]>;
export declare function listDefaultModels(): Promise<AdapterModel[]>;
export declare function resetModelCacheForTests(): void;
//# sourceMappingURL=models.d.ts.map