import { PropsWithChildren } from "react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
}>;

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-overlay)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000
      }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(500px, 90vw)",
          padding: "1.1rem"
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "0.8rem"
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
};
