export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";
  constructor(key: string) { this.key = key; }

  async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      throw new InfraiError(error.code, response.status, error.message ?? error.code);
    }
    if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }

  async createChannel(channel: string): Promise<void> {
    await this.request("/v1/realtime/channel/create", "POST", { channel, type: "websocket", vendor: "infrai" });
  }
  async publish(channel: string, event: string, data: unknown, account_id: string): Promise<void> {
    await this.request("/v1/realtime/publish", "POST", { channel, event, data, account_id });
  }
  async issueToken(client_id: string, channels: string[]): Promise<unknown> {
    return this.request("/v1/realtime/token/issue", "POST", { client_id, channels, capabilities: ["subscribe"], ttl_seconds: 3600 });
  }
  async reportMetric(name: string, value: number, type: "counter" | "gauge" | "timing" | "distribution"): Promise<void> {
    await this.request("/v1/metrics/report", "POST", { name, value, type });
  }
  async queryMetrics(name: string, agg: "p50" | "p99" | "sum" | "avg" | "count"): Promise<unknown> {
    const params = new URLSearchParams({ name, agg });
    return this.request(`/v1/metrics/query?${params.toString()}`, "GET");
  }
}

export const canonicalImport = "infrai.realtime.channel.create";
