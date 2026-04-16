import { FormEvent, useState } from "react";
import { useAuthStore } from "./auth.store";
import { Modal } from "@shared/ui/Modal";
import { Input } from "@shared/ui/Input";
import { Button } from "@shared/ui/Button";
import { useI18nStore } from "@features/i18n/i18n.store";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const error = useAuthStore((s) => s.error);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const t = useI18nStore((s) => s.t);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    if (mode === "login") {
      await login(username.trim(), password);
    } else {
      await signup(username.trim(), password);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "login" ? "System Login" : "New Entity Register"}>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.9rem" }}>
        <Button variant={mode === "login" ? "primary" : "ghost"} onClick={() => setMode("login")}>
          {t("Login", "Acceder")}
        </Button>
        <Button variant={mode === "signup" ? "primary" : "ghost"} onClick={() => setMode("signup")}>
          {t("Register", "Registro")}
        </Button>
      </div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <Input placeholder="USERNAME" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          placeholder="PASSWORD"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button variant="primary" type="submit">
          {mode === "login" ? t("Initialize Session", "Inicializar sesion") : t("Create Entity", "Crear entidad")}
        </Button>
      </form>
      {error ? (
        <div style={{ marginTop: "0.75rem", color: "var(--color-error)", fontSize: "0.8rem" }}>{error}</div>
      ) : null}
    </Modal>
  );
};
