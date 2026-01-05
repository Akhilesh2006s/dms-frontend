export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      let message = "Request failed";
      try {
        const data = await res.json();
        message = data?.message || message;
      } catch (_) {}
      throw new Error(message);
    }

    return (await res.json()) as T;
  } catch (error: any) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. Please make sure the backend is running.`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}


