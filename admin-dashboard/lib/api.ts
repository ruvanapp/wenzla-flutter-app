const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://wenzla-backend-production.up.railway.app';
let adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? '';

export function setAdminToken(token: string) {
  adminToken = token;
}

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Admin API failed: ${response.status}`);
  }

  return response.json();
}
