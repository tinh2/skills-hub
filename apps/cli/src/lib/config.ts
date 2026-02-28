import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".skills-hub");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiUrl: string;
  apiKey?: string;
  accessToken?: string;
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
  mkdirSync(CONFIG_DIR, { recursive: true });
  const current = getConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...config }, null, 2));
}

export function getAuthHeader(): Record<string, string> {
  const config = getConfig();
  if (config.apiKey) return { Authorization: `ApiKey ${config.apiKey}` };
  if (config.accessToken) return { Authorization: `Bearer ${config.accessToken}` };
  return {};
}
