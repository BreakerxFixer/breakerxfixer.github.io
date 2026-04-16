import { PropsWithChildren } from "react";

export const Badge = ({ children }: PropsWithChildren) => (
  <span
    style={{
      display: "inline-block",
      padding: "0.15rem 0.45rem",
      border: "1px solid var(--border-default)",
      color: "var(--text-secondary)",
      fontFamily: "var(--font-heading)",
      fontSize: "0.62rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase"
    }}
  >
    {children}
  </span>
);
