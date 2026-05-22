// ══════════════════════════════════════════════════════════════════════════════
// CMS Base API Client
// Centralises all fetch() calls — no raw fetch() anywhere in UI components
// ══════════════════════════════════════════════════════════════════════════════

import type { ApiConfig, ApiError } from '../types';

export class CmsApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.token}`,
    };
  }

  private get uploadHeaders(): HeadersInit {
    return { Authorization: `Bearer ${this.config.token}` };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async delete<T = void>(path: string): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    return this.handleResponse<T>(res);
  }

  async uploadFile<T>(path: string, file: File, fieldName = 'image'): Promise<T> {
    const fd = new FormData();
    fd.append(fieldName, file);
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.uploadHeaders,
      body: fd,
    });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.text();
        const parsed = JSON.parse(body);
        message = parsed.message || parsed.error || body || message;
      } catch {
        // keep default message
      }
      const err: ApiError = { message, status: res.status };
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
