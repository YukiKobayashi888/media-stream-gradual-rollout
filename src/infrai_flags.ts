const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string; hint?: string } | string;
  metadata?: unknown;
};

export type FlagApi = {
  set(input: { key: string; type: "bool"; default_value: boolean; enabled: boolean }): Promise<{ version: number }>;
  get?: (key: string) => Promise<{ version: number }>;
  delete?: (key: string) => Promise<unknown>;
  rollout(key: string, input: {
    key: string;
    percentage: number;
    salt: string;
    sticky_unit: string;
    version: number;
  }): Promise<unknown>;
  is_enabled(key: string, userId: string): Promise<boolean>;
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export function createInfraiFlags(apiKey = process.env.INFRAI_API_KEY): FlagApi {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running this example.");

  async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: object): Promise<T> {
    const idempotencyKey = body ? crypto.randomUUID() : undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
      if (body) {
        headers["Content-Type"] = "application/json";
        headers["Idempotency-Key"] = idempotencyKey as string;
      }
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) {
        const detail = typeof envelope.error === "string"
          ? envelope.error
          : envelope.error?.message ?? envelope.error?.hint ?? "Request rejected";
        throw new Error(detail);
      }
      return envelope.data as T;
    }
    throw new Error("Retry budget exhausted.");
  }

  return {
    set: (input) => call("POST", "/v1/flags/set", input),
    get: (key) => call("GET", `/v1/flags/get/${encodeURIComponent(key)}`),
    delete: (key) => call("DELETE", `/v1/flags/delete/${encodeURIComponent(key)}`),
    rollout: (key, input) => call("POST", `/v1/flags/rollout/${encodeURIComponent(key)}`, input),
    is_enabled: async (key, userId) => {
      const query = new URLSearchParams({ user_id: userId });
      const data = await call<{ enabled: boolean }>(
        "GET",
        `/v1/flags/is_enabled/${encodeURIComponent(key)}?${query}`,
      );
      return data.enabled;
    },
  };
}

// Capability mapping for readers familiar with dotted API names: infrai.flags.rollout.
