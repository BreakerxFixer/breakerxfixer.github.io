import { useRef, useState } from "react";
import { Modal } from "@shared/ui/Modal";
import { useAuthStore } from "./auth.store";
import { profileService } from "@services/supabase/profile.service";
import { Button } from "@shared/ui/Button";
import { useI18nStore } from "@features/i18n/i18n.store";
import { useTutorialStore } from "@features/tutorial/tutorial.store";

type AccountPanelProps = {
  open: boolean;
  onClose: () => void;
};

export const AccountPanel = ({ open, onClose }: AccountPanelProps) => {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = useI18nStore((s) => s.t);
  const replayTutorial = useTutorialStore((s) => s.replay);

  const cropToSquare = (file: File) =>
    new Promise<File>((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("image_read_failed"));
      reader.onload = () => {
        img.src = String(reader.result);
      };
      img.onerror = () => reject(new Error("image_parse_failed"));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = Math.floor((img.width - size) / 2);
        const sy = Math.floor((img.height - size) / 2);
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("image_context_failed"));
          return;
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("image_crop_failed"));
              return;
            }
            resolve(new File([blob], "avatar.png", { type: "image/png" }));
          },
          "image/png",
          0.95
        );
      };
      reader.readAsDataURL(file);
    });

  const onAvatarUpload = async (file?: File) => {
    if (!file || !session) return;
    setBusy(true);
    try {
      const cropped = await cropToSquare(file);
      await profileService.updateAvatar(session.user.id, cropped);
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!window.confirm(t("This action is irreversible. Continue?", "Esta accion es irreversible. Continuar?"))) {
      return;
    }
    setBusy(true);
    try {
      await profileService.deleteAccount();
      await logout();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Entity Profile">
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ color: "var(--text-secondary)" }}>
          <strong>{profile?.username ?? "ENTITY"}</strong> · {profile?.points ?? 0} PTS
        </div>
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="avatar"
            style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-default)" }}
          />
        ) : (
          <div style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid var(--border-default)" }}>👾</div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => void onAvatarUpload(e.target.files?.[0])}
        />
        <Button disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t("Uploading...", "Subiendo...") : t("Upload Avatar", "Subir avatar")}
        </Button>
        <Button variant="ghost" onClick={() => void logout()}>
          {t("Sign out", "Cerrar sesion")}
        </Button>
        <Button onClick={replayTutorial}>{t("Replay tutorial", "Repetir tutorial")}</Button>
        <Button variant="danger" disabled={busy} onClick={() => void onDeleteAccount()}>
          {t("Delete account", "Borrar cuenta")}
        </Button>
      </div>
    </Modal>
  );
};
