export type SseExpertEvent = Record<string, unknown>;
export type SseOracleEvent = Record<string, unknown>;

export async function runSse(
  url: string,
  body: unknown,
  onExpert: (e: SseExpertEvent) => void,
  onOracle: (o: SseOracleEvent) => void,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 300)}` : ""}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let runResult: Record<string, unknown> = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
        if (event.type === "expert-complete") {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { type: _t, ...data } = event;
          onExpert(data);
        } else if (event.type === "oracle-complete") {
          onOracle(event.oracle as Record<string, unknown>);
        } else if (event.type === "run-complete") {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { type: _t2, ...data } = event;
          runResult = data;
        }
      } catch {
        // ignore malformed lines
      }
    }
  }
  return runResult;
}
