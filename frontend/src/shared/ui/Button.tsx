import { ButtonHTMLAttributes, CSSProperties, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "ghost" | "danger";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
  }
>;

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--gradient-primary)",
    color: "#000",
    border: "none"
  },
  ghost: {
    background: "transparent",
    color: "var(--color-primary)",
    border: "1px solid var(--border-default)"
  },
  danger: {
    background: "transparent",
    color: "var(--color-error)",
    border: "1px solid var(--color-error)"
  }
};

export const Button = ({ variant = "ghost", children, style, ...props }: ButtonProps) => (
  <button
    {...props}
    style={{
      padding: "0.65rem 1rem",
      fontFamily: "var(--font-heading)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      fontSize: "0.72rem",
      borderRadius: "var(--radius-none)",
      cursor: "pointer",
      transition: "all .2s ease",
      ...variantStyles[variant],
      ...style
    }}
  >
    {children}
  </button>
);
