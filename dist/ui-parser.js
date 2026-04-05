export function parseStdoutLine(line, ts) {
    const text = String(line ?? "").replace(/\r?\n$/, "");
    if (!text)
        return [];
    return [{ kind: "assistant", ts, text }];
}
//# sourceMappingURL=ui-parser.js.map