const BASE_URL = import.meta.env.VITE_FASTAPI_URL ?? "https://breakerxfixer-api.onrender.com/api/v2/platform";

type ApiError = {
  message: string;
  status: number;
};

async function parsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await parsePayload(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload
        ? (payload.detail as string) || (payload.error as string) || (payload.message as string) || "Request failed"
        : "Request failed";
    throw { message, status: response.status } as ApiError;
  }

  return payload as T;
}

export { BASE_URL };
