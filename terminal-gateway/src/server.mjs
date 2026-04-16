import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { SessionManager } from "./session-manager.mjs";
import { ensureContainer, execCommand, removeContainer } from "./runtime-adapter.mjs";

const PORT = Number(process.env.TERMINAL_GATEWAY_PORT || 8788);
const manager = new SessionManager();

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "terminal-gateway", ts: Date.now() }));
    return;
  }

  if (req.method === "POST" && req.url === "/session/start") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk.toString()));
    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        const userId = String(body.userId || "").trim();
        if (!userId) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "userId required" }));
          return;
        }
        const session = manager.create(userId);
        await ensureContainer(session);
        session.status = "ready";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            sessionId: session.sessionId,
            expiresAt: session.expiresAt
          })
        );
      } catch (error) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

const wss = new WebSocketServer({ server, path: "/ws/terminal" });
wss.on("connection", (ws, request) => {
  const url = new URL(request.url, "http://localhost");
  const sessionId = url.searchParams.get("sessionId") || "";
  const session = manager.get(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: "error", message: "invalid or expired session" }));
    ws.close();
    return;
  }
  manager.touch(sessionId);
  ws.send(JSON.stringify({ type: "ready", sessionId }));

  ws.on("message", async (buffer) => {
    try {
      const data = JSON.parse(buffer.toString());
      if (data.type !== "command") return;
      const command = String(data.command || "").trim();
      if (!command) {
        ws.send(JSON.stringify({ type: "output", value: "" }));
        return;
      }
      manager.touch(sessionId);
      const value = await execCommand(session, command);
      ws.send(JSON.stringify({ type: "output", value }));
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", message: error.message }));
    }
  });
});

setInterval(async () => {
  const now = Date.now();
  const gc = [];
  manager.forEach((session) => {
    if (session.expiresAt < now) gc.push(session);
  });
  for (const session of gc) {
    await removeContainer(session);
    manager.close(session.sessionId);
  }
}, 30_000).unref();

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[terminal-gateway] listening on :${PORT}`);
});
