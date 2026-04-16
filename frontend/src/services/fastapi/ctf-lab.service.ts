import { apiRequest } from "./client";

export const ctfLabService = {
  getMathChallenge() {
    return apiRequest<{ equation: string; token: string; message: string }>("/math-challenge");
  },

  submitMathChallenge(answer: number, token: string) {
    return apiRequest<{ success?: boolean; message?: string; equation?: string; token?: string; error?: string }>(
      "/math-challenge",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, token })
      }
    );
  },

  verifyJwt(token: string) {
    return apiRequest<{ message: string; flag?: string }>("/jwt-verify", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
