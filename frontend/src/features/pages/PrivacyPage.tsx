import { Card } from "@shared/ui/Card";

export const PrivacyPage = () => (
  <Card>
    <h2 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>Privacy Policy</h2>
    <p style={{ color: "var(--text-secondary)" }}>
      The platform is designed for zero-PII operation. Accounts are based on alias credentials and only gameplay data
      (points, solves, social interactions) is stored for core functionality.
    </p>
  </Card>
);
