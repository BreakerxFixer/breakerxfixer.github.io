import { CSSProperties, PropsWithChildren } from "react";

export const Card = ({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) => (
  <div
    className="panel"
    style={{
      padding: "1.1rem",
      ...style
    }}
  >
    {children}
  </div>
);
