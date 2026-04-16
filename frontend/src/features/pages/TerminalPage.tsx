import { FormEvent, useMemo, useState } from "react";
import { Card } from "@shared/ui/Card";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { useAuthStore } from "@features/auth/auth.store";

const GATEWAY_HTTP = import.meta.env.VITE_TERMINAL_GATEWAY_HTTP ?? "http://127.0.0.1:8788";
const GATEWAY_WS = import.meta.env.VITE_TERMINAL_GATEWAY_WS ?? "ws://127.0.0.1:8788/ws/terminal";

export const TerminalPage = () => {
  const session = useAuthStore((s) => s.session);
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [output, setOutput] = useState<string[]>(["[system] Terminal gateway disconnected."]);
  const [command, setCommand] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const status = useMemo(() => {
    if (connecting) return "CONNECTING";
    if (socket?.readyState === WebSocket.OPEN) return "ONLINE";
    return "OFFLINE";
  }, [connecting, socket]);

  const append = (line: string) => {
    setOutput((prev) => [...prev.slice(-200), line]);
  };

  const openSession = async () => {
    if (!session) return;
    setConnecting(true);
    try {
      const response = await fetch(`${GATEWAY_HTTP}/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || "gateway session failed");
      const sid = String(payload.sessionId);
      setTerminalSessionId(sid);
      const ws = new WebSocket(`${GATEWAY_WS}?sessionId=${encodeURIComponent(sid)}`);
      ws.onopen = () => append("[gateway] session connected");
      ws.onclose = () => append("[gateway] session closed");
      ws.onerror = () => append("[gateway] socket error");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (data.type === "ready") append(`[gateway] ready: ${data.sessionId}`);
          else if (data.type === "output") append(String(data.value || ""));
          else if (data.type === "error") append(`[error] ${String(data.message || "unknown")}`);
        } catch {
          append(String(event.data));
        }
      };
      setSocket(ws);
    } catch (error) {
      append(`[error] ${(error as Error).message}`);
    } finally {
      setConnecting(false);
    }
  };

  const runCommand = (e: FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd || !socket || socket.readyState !== WebSocket.OPEN) return;
    append(`$ ${cmd}`);
    socket.send(JSON.stringify({ type: "command", command: cmd }));
    setCommand("");
  };

  return (
    <Card style={{ display: "grid", gap: ".8rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>ARCH LINUX TERMINAL</h3>
        <span style={{ color: status === "ONLINE" ? "var(--color-success)" : "var(--text-dim)", fontFamily: "var(--font-heading)", fontSize: ".74rem" }}>
          {status}
        </span>
      </div>

      <div style={{ background: "#000", border: "1px solid var(--border-default)", minHeight: "62vh", padding: ".8rem", overflow: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
        {output.join("\n")}
      </div>

      {!terminalSessionId ? (
        <Button variant="primary" disabled={!session || connecting} onClick={() => void openSession()}>
          {connecting ? "CREATING_SESSION..." : "START ARCH SESSION"}
        </Button>
      ) : null}

      <form onSubmit={runCommand} style={{ display: "flex", gap: ".5rem" }}>
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="type command (e.g. uname -a, pacman -Qi bash)"
        />
        <Button variant="primary" type="submit">
          RUN
        </Button>
      </form>
    </Card>
  );
};
