/**
 * OpenFang Runtime Client
 *
 * Prototype client for communicating with an OpenFang runtime instance.
 * In production, this would connect to a managed OpenFang binary via its gRPC/HTTP API.
 * For now, it provides the interface and simulates responses for development.
 */

export interface OpenFangConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface SpawnHandRequest {
  handToml: string;
  agentName: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  channelType?: string;
  channelConfig?: Record<string, unknown>;
}

export interface SpawnHandResponse {
  handId: string;
  status: "spawned" | "error";
  message?: string;
}

export interface HandStatus {
  handId: string;
  status: "running" | "paused" | "stopped" | "error";
  uptime_seconds: number;
  execution_count: number;
  last_error?: string;
}

export interface ExecuteHandRequest {
  handId: string;
  input: string;
}

export interface ExecuteHandResponse {
  executionId: string;
  output: string;
  durationMs: number;
  tokenCount: number;
  status: "completed" | "failed" | "timeout";
  error?: string;
}

export class OpenFangClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;
  private connected = false;

  constructor(config: OpenFangConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  async checkHealth(): Promise<boolean> {
    try {
      // In production: HTTP GET to OpenFang health endpoint
      // For prototype: simulate health check
      this.connected = !!this.baseUrl;
      return this.connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async spawnHand(request: SpawnHandRequest): Promise<SpawnHandResponse> {
    // In production: POST to OpenFang spawn endpoint with HAND.toml
    // For prototype: return a simulated hand ID
    const handId = `hand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      handId,
      status: "spawned",
      message: `Hand "${request.agentName}" spawned successfully (simulated)`,
    };
  }

  async getHandStatus(handId: string): Promise<HandStatus> {
    // In production: GET from OpenFang status endpoint
    return {
      handId,
      status: "running",
      uptime_seconds: 0,
      execution_count: 0,
    };
  }

  async executeHand(request: ExecuteHandRequest): Promise<ExecuteHandResponse> {
    // In production: POST to OpenFang execute endpoint
    const startTime = Date.now();

    return {
      executionId: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      output: `[OpenFang Execution Preview]\n\nHand: ${request.handId}\nInput: ${request.input.slice(0, 200)}${request.input.length > 200 ? "..." : ""}\n\nThis is a simulated execution. Connect an OpenFang runtime to enable real execution.`,
      durationMs: Date.now() - startTime,
      tokenCount: Math.ceil(request.input.length / 4),
      status: "completed",
    };
  }

  async pauseHand(handId: string): Promise<{ success: boolean }> {
    // In production: POST to OpenFang pause endpoint
    return { success: true };
  }

  async resumeHand(handId: string): Promise<{ success: boolean }> {
    // In production: POST to OpenFang resume endpoint
    return { success: true };
  }

  async killHand(handId: string): Promise<{ success: boolean }> {
    // In production: POST to OpenFang kill endpoint
    return { success: true };
  }
}

// Singleton — initialized from env config
let _client: OpenFangClient | null = null;

export function getOpenFangClient(): OpenFangClient {
  if (!_client) {
    _client = new OpenFangClient({
      baseUrl: process.env.OPENFANG_URL ?? "http://localhost:9090",
      apiKey: process.env.OPENFANG_API_KEY,
    });
  }
  return _client;
}
