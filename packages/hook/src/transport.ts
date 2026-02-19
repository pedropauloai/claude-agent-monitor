import { request } from "node:http";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { DEFAULT_SERVER_PORT, DEFAULT_HOST } from "@claudecam/shared";

/**
 * Debug logging via CAM_DEBUG=1 environment variable.
 * Outputs to stderr so it never interferes with hook stdout (used by Claude Code).
 */
const DEBUG = process.env["CAM_DEBUG"] === "1";

/** Timeout per individual HTTP request (ms). */
const REQUEST_TIMEOUT_MS = 2000;

/** Maximum number of send attempts across all fallback hosts. */
const MAX_ATTEMPTS = 3;

/** Base delay for exponential backoff between attempts (ms). */
const BASE_BACKOFF_MS = 100;

function debugLog(msg: string): void {
  if (DEBUG) {
    process.stderr.write(`[cam-hook] ${msg}\n`);
  }
}

/**
 * Resolve the server host for hook connections.
 * Priority:
 *   1. CAM_SERVER_HOST env var (explicit override)
 *   2. Auto-detect WSL → use Windows host IP (default gateway)
 *   3. DEFAULT_HOST ('localhost')
 */
let resolvedHost: string | undefined;

function getServerHost(): string {
  if (resolvedHost) return resolvedHost;

  // 1. Explicit env var override
  const envHost = process.env["CAM_SERVER_HOST"];
  if (envHost) {
    resolvedHost = envHost;
    debugLog(`Host from CAM_SERVER_HOST: ${resolvedHost}`);
    return resolvedHost;
  }

  // 2. Auto-detect WSL and resolve Windows host IP
  try {
    const procVersion = readFileSync("/proc/version", "utf8");
    if (procVersion.toLowerCase().includes("microsoft")) {
      debugLog("WSL detected, resolving Windows host IP...");
      // Running inside WSL2 - resolve Windows host IP via default gateway
      // (nameserver in /etc/resolv.conf may point to Docker DNS, not Windows)
      try {
        const route = execSync("ip route show default 2>/dev/null", {
          encoding: "utf8",
          timeout: 2000,
        });
        const gwMatch = route.match(/via\s+(\d+\.\d+\.\d+\.\d+)/);
        if (gwMatch) {
          resolvedHost = gwMatch[1];
          debugLog(`Resolved via default gateway: ${resolvedHost}`);
          return resolvedHost;
        }
      } catch {
        debugLog("ip route failed, trying resolv.conf...");
      }
      try {
        const resolv = readFileSync("/etc/resolv.conf", "utf8");
        const match = resolv.match(/nameserver\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          resolvedHost = match[1];
          debugLog(`Resolved via nameserver: ${resolvedHost}`);
          return resolvedHost;
        }
      } catch {
        debugLog("resolv.conf read failed");
      }
    }
  } catch {
    // Not WSL or can't read files - fall through
  }

  // 3. Default
  resolvedHost = DEFAULT_HOST;
  debugLog(`Using default host: ${resolvedHost}`);
  return resolvedHost;
}

/**
 * Build an ordered list of hosts to try.
 * Primary host first, then fallbacks (localhost, 127.0.0.1).
 * Deduplicates entries so we never retry the same host.
 */
function getFallbackHosts(): string[] {
  const primary = getServerHost();
  const candidates = [primary, "localhost", "127.0.0.1"];
  const seen = new Set<string>();
  const hosts: string[] = [];

  for (const host of candidates) {
    if (!seen.has(host)) {
      seen.add(host);
      hosts.push(host);
    }
  }

  return hosts;
}

/**
 * Attempt a single HTTP POST to the given host.
 * Resolves to `true` on success (2xx/3xx/4xx), `false` on connection error or timeout.
 * 4xx is considered "delivered" (server received it but rejected the payload).
 * 5xx triggers a retry on the next host.
 */
function doPost(hostname: string, body: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = request(
      {
        hostname,
        port: DEFAULT_SERVER_PORT,
        path: "/api/events",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        // Drain response to free socket
        res.resume();
        const code = res.statusCode ?? 0;
        const ok = code >= 200 && code < 500;
        if (!ok) {
          debugLog(`Server responded with HTTP ${code} on ${hostname}`);
        }
        resolve(ok);
      },
    );

    req.on("error", (err: NodeJS.ErrnoException) => {
      debugLog(`Connection error on ${hostname}: ${err.code ?? err.message}`);
      resolve(false);
    });

    req.on("timeout", () => {
      debugLog(`Request timeout on ${hostname} (${REQUEST_TIMEOUT_MS}ms)`);
      req.destroy();
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Wait for a given number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends an event payload to the CAM server via HTTP POST.
 *
 * Resilience strategy:
 *   1. Try the primary host (resolved via WSL detection or env var)
 *   2. On failure, try fallback hosts (localhost, 127.0.0.1) with exponential backoff
 *   3. Max 3 attempts total across all hosts
 *   4. Each attempt has a 2s timeout
 *   5. Debug logging available via CAM_DEBUG=1
 *
 * Always fire-and-forget: never blocks the calling code.
 * Fails silently if the server is not running.
 */
export function sendEvent(payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  const hosts = getFallbackHosts();

  // Fire-and-forget async retry cascade
  void (async () => {
    let attempt = 0;

    for (const hostname of hosts) {
      if (attempt >= MAX_ATTEMPTS) break;

      // Exponential backoff between retries (skip delay on first attempt)
      if (attempt > 0) {
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        debugLog(`Backoff ${backoffMs}ms before attempt ${attempt + 1}`);
        await delay(backoffMs);
      }

      debugLog(
        `POST to ${hostname}:${DEFAULT_SERVER_PORT} (attempt ${attempt + 1}/${MAX_ATTEMPTS})`,
      );

      const success = await doPost(hostname, body);
      if (success) {
        debugLog(`Event delivered via ${hostname}`);
        return;
      }

      attempt++;
    }

    debugLog("All attempts exhausted, event dropped");
  })();
}
