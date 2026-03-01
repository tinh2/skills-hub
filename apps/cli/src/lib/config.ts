import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".skills-hub");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiUrl: string;
  apiKey?: string;
  accessToken?: string;
  defaultOrg?: string;
}

const DEFAULT_CONFIG: Config = {
  apiUrl: "https://api.skills-hub.ai",
};

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Partial<Config>): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const current = getConfig();
  const data = JSON.stringify({ ...current, ...config }, null, 2);
  // Atomic write: write to temp file then rename
  const tmpFile = CONFIG_FILE + ".tmp";
  writeFileSync(tmpFile, data, { mode: 0o600 });
  renameSync(tmpFile, CONFIG_FILE);
}

export function getAuthHeader(): Record<string, string> {
  const config = getConfig();
  if (config.apiKey) return { Authorization: `ApiKey ${config.apiKey}` };
  if (config.accessToken) return { Authorization: `Bearer ${config.accessToken}` };
  return {};
}

export function ensureAuth(): void {
  const config = getConfig();
  if (!config.apiKey && !config.accessToken) {
    console.error("Not authenticated. Run `skills-hub login` first.");
    process.exit(1);
  }
}
