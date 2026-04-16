import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: InputProps) => (
  <input
    {...props}
    style={{
      width: "100%",
      background: "#000",
      color: "var(--text-primary)",
      border: "1px solid var(--border-strong)",
      padding: "0.7rem 0.8rem",
      fontFamily: "var(--font-sans)",
      outline: "none",
      ...props.style
    }}
  />
);
