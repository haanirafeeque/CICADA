import { createServer } from "node:http";

type StoredValue = { value: string; expiresAt?: number };
const values = new Map<string, StoredValue>();

function liveEntry(key: string): StoredValue | undefined {
  const entry = values.get(key);
  if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
    values.delete(key);
    return undefined;
  }
  return entry;
}

function setEntry(key: string, value: string, seconds?: number): void {
  values.set(key, { value, expiresAt: seconds ? Date.now() + seconds * 1000 : undefined });
}

async function readBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function send(response: import("node:http").ServerResponse, result: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  response.end(JSON.stringify({ result }));
}

function sendRaw(response: import("node:http").ServerResponse, value: unknown): void {
  response.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "authorization, content-type" });
    response.end();
    return;
  }

  if (url.pathname === "/health") return send(response, "ok");
  if (url.pathname === "/__reset") {
    values.clear();
    return send(response, "ok");
  }

  if (url.pathname === "/__seed" || url.pathname === "/__mutate") {
    const body = await readBody(request) as { key?: string; value?: unknown; id?: string; riddleOpenedAt?: number } | null;
    if (!body) return send(response, "invalid", 400);
    const key = body.key || (body.id ? `session:${body.id}` : "");
    if (!key) return send(response, "invalid", 400);
    if (url.pathname === "/__seed") {
      setEntry(key, JSON.stringify(body.value), 24 * 60 * 60);
    } else {
      const current = liveEntry(key);
      if (!current) return send(response, "missing", 404);
      const session = JSON.parse(current.value) as Record<string, unknown>;
      if (typeof body.riddleOpenedAt === "number") session.riddleOpenedAt = body.riddleOpenedAt;
      setEntry(key, JSON.stringify(session), 24 * 60 * 60);
    }
    return send(response, "ok");
  }

  if (url.pathname === "/__inspect") {
    const key = url.searchParams.get("key") || "";
    const entry = liveEntry(key);
    let result: unknown = entry?.value ?? null;
    if (typeof result === "string") {
      try { result = JSON.parse(result); } catch { /* Keep scalar values as strings. */ }
    }
    return send(response, result);
  }

  if (url.pathname === "/__ttl") {
    const entry = liveEntry(url.searchParams.get("key") || "");
    const seconds = entry?.expiresAt ? Math.ceil((entry.expiresAt - Date.now()) / 1000) : null;
    return send(response, seconds);
  }

  const body = await readBody(request);
  if (!Array.isArray(body)) return send(response, null, 400);

  function runCommand(commandParts: unknown[]): unknown {
    if (typeof commandParts[0] !== "string") throw new Error("invalid command");
    const [commandName, ...args] = commandParts;
    const command = commandName.toLowerCase();

    if (command === "get") return liveEntry(String(args[0]))?.value ?? null;
    if (command === "exists") return liveEntry(String(args[0])) ? 1 : 0;
    if (command === "set") {
      const key = String(args[0]);
      const current = liveEntry(key);
      if (args.some((arg) => String(arg).toLowerCase() === "nx") && current) return null;
      const expiresIndex = args.findIndex((arg) => String(arg).toLowerCase() === "ex");
      const seconds = expiresIndex >= 0 ? Number(args[expiresIndex + 1]) : undefined;
      setEntry(key, String(args[1]), seconds);
      return "OK";
    }
    if (command === "incr") {
      const key = String(args[0]);
      const current = liveEntry(key);
      const next = Number.parseInt(current?.value || "0", 10) + 1;
      if (!Number.isSafeInteger(next)) throw new Error("not an integer");
      setEntry(key, String(next));
      return next;
    }
    if (command === "expire") {
      const current = liveEntry(String(args[0]));
      if (!current) return 0;
      current.expiresAt = Date.now() + Number(args[1]) * 1000;
      return 1;
    }
    if (command === "del") {
      let count = 0;
      for (const rawKey of args) if (values.delete(String(rawKey))) count += 1;
      return count;
    }
    if (command === "eval") {
      const keyCount = Number(args[1]);
      const keys = args.slice(2, 2 + keyCount).map(String);
      const evalArgs = args.slice(2 + keyCount).map(String);
      const [completedKey, counterKey, sessionKey, nameKey, emailKey, codeKey] = keys;
      if (!completedKey || !counterKey || !sessionKey || !nameKey || !emailKey || !codeKey) throw new Error("invalid script keys");
      if (liveEntry(completedKey)) return 0;

      const ttl = Number(evalArgs[0]);
      const limit = Number(evalArgs[1]);
      const [name, email, couponCode] = evalArgs.slice(2);
      const current = liveEntry(sessionKey);
      const session = current ? JSON.parse(current.value) as Record<string, unknown> : {};

      if (liveEntry(nameKey) || liveEntry(emailKey)) {
        session.ctfCompleted = true;
        session.winnerClaimRejected = true;
        setEntry(completedKey, "1", ttl);
        setEntry(sessionKey, JSON.stringify(session), ttl);
        return -1;
      }
      if (liveEntry(codeKey)) return -2;

      setEntry(completedKey, "1", ttl);
      const index = Number.parseInt(liveEntry(counterKey)?.value || "0", 10) + 1;
      setEntry(counterKey, String(index));
      session.ctfCompleted = true;
      if (index <= limit) {
        const indexText = String(index).padStart(2, "0");
        setEntry(nameKey, indexText);
        setEntry(emailKey, indexText);
        setEntry(codeKey, indexText);
        setEntry(`winner:${indexText}`, JSON.stringify({ name, email, couponCode, winnerIndex: indexText }));
        session.winnerIndex = index;
        session.winnerCode = couponCode;
      }
      setEntry(sessionKey, JSON.stringify(session), ttl);
      return index;
    }
    throw new Error(`unsupported command: ${command}`);
  }

  try {
    const commands = Array.isArray(body[0]) ? body as unknown[][] : [body];
    const results = commands.map(runCommand);
    if (url.pathname === "/pipeline" || url.pathname === "/multi-exec") {
      return sendRaw(response, results.map((result) => ({ result, error: null })));
    }
    return send(response, Array.isArray(body[0]) ? results : results[0]);
  } catch {
    return send(response, "invalid command", 400);
  }
});

server.listen(8787, "127.0.0.1");
