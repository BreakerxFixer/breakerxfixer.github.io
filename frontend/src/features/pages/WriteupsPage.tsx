import { Card } from "@shared/ui/Card";
import { Input } from "@shared/ui/Input";
import { useMemo, useState } from "react";

const writeups = [
  { id: "htb-lame", title: "HTB - Lame", lang: "en", excerpt: "Samba exploit chain and privilege escalation." },
  { id: "htb-blue", title: "HTB - Blue", lang: "es", excerpt: "EternalBlue walk-through con post explotación." }
];

export const WriteupsPage = () => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => writeups.filter((item) => `${item.title} ${item.excerpt}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Input placeholder="Search writeups..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {filtered.map((item) => (
        <Card key={item.id}>
          <h3 style={{ fontFamily: "var(--font-heading)", margin: 0 }}>{item.title}</h3>
          <p style={{ color: "var(--text-secondary)" }}>{item.excerpt}</p>
        </Card>
      ))}
    </div>
  );
};
