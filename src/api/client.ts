import ky, { type KyInstance, type HTTPError } from "ky";

export function createKenerClient(baseUrl: string, apiKey: string): KyInstance {
  const normalizedUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return ky.create({
    prefixUrl: `${normalizedUrl}/api/v4`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    retry: {
      limit: 3,
      statusCodes: [429, 500, 502, 503],
    },
    timeout: 15_000,
    hooks: {
      beforeError: [
        async (error: HTTPError) => {
          const { response } = error;
          if (response.body) {
            try {
              const cloned = response.clone();
              const body = await cloned.text();
              if (body) {
                error.message = `${error.message} — ${body}`;
              }
            } catch {
              // ignore body parse errors
            }
          }
          return error;
        },
      ],
    },
  });
}
