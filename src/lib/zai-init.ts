import fs from "fs";
import os from "os";
import path from "path";

/**
 * Ensures the z-ai-web-dev-sdk can find its config file on any platform.
 *
 * The SDK reads from a `.z-ai-config` JSON file (not env vars), checking
 * process.cwd(), then os.homedir(), then /etc. On Vercel serverless, the
 * only writable directory is /tmp — so we write the config there and set
 * HOME=/tmp so the SDK's homedir check finds it.
 *
 * Required env vars (set in Vercel project settings):
 *   ZAI_BASE_URL  — e.g. https://internal-api.z.ai/v1
 *   ZAI_API_KEY   — the API key
 *   ZAI_TOKEN     — the JWT auth token
 *   ZAI_CHAT_ID   — the chat session ID
 *   ZAI_USER_ID   — the user ID
 */
let initialised = false;

export function ensureZaiConfig(): void {
  if (initialised) return;
  initialised = true;

  // If /etc/.z-ai-config already exists (sandbox env), nothing to do.
  try {
    if (fs.existsSync("/etc/.z-ai-config")) return;
  } catch {
    // ignore
  }

  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) {
    return; // SDK will throw when ZAI.create() is called
  }

  const config = {
    baseUrl,
    apiKey,
    chatId: process.env.ZAI_CHAT_ID || "",
    token: process.env.ZAI_TOKEN || "",
    userId: process.env.ZAI_USER_ID || "",
  };
  const json = JSON.stringify(config);

  // Write to every location the SDK checks, plus /tmp (writable on Vercel).
  const targets = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
    "/tmp/.z-ai-config",
  ];

  let written = false;
  for (const target of targets) {
    try {
      if (!fs.existsSync(target)) {
        fs.writeFileSync(target, json, { mode: 0o600 });
        written = true;
      } else {
        // Already exists — assume it's valid.
        written = true;
      }
    } catch {
      // Read-only filesystem — skip.
    }
  }

  // On Vercel, process.cwd() and os.homedir() may both be read-only at
  // runtime. If we could only write to /tmp, point HOME there so the SDK's
  // homedir check finds the config.
  if (written) {
    try {
      const tmpConfig = "/tmp/.z-ai-config";
      if (fs.existsSync(tmpConfig) && !fs.existsSync(path.join(os.homedir(), ".z-ai-config"))) {
        process.env.HOME = "/tmp";
      }
    } catch {
      // ignore
    }
  }
}
