type TabOption<T extends string> = {
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
};

export const Tabs = <T extends string>({ value, options, onChange }: TabsProps<T>) => (
  <div style={{ display: "flex", gap: "0.9rem" }}>
    {options.map((tab) => {
      const active = tab.id === value;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            background: "transparent",
            border: "none",
            color: active ? "var(--color-primary)" : "var(--text-secondary)",
            borderBottom: active ? "1px solid var(--color-primary)" : "1px solid transparent",
            paddingBottom: "0.25rem",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: "0.72rem",
            cursor: "pointer"
          }}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
