import { useEffect } from "react";
import { useAppRouter } from "@app/router";
import { useAuthStore } from "@features/auth/auth.store";

export const App = () => {
  const Router = useAppRouter();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return <Router />;
};
