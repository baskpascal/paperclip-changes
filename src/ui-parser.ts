export function parseStdoutLine(line: string, ts: string) {
  const text = String(line ?? "").replace(/\r?\n$/, "");
  if (!text) return [];
  return [{ kind: "assistant", ts, text }];
}
