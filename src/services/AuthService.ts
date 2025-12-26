const BACKEND_URL = "https://backend.movilive.es";

class AuthServiceClass {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<string> | null = null;

  async getToken(deviceId: string): Promise<string> {
    // Si el token existe y no expira en los próximos 30 segundos, usarlo
    if (this.token && Date.now() < this.tokenExpiry - 30000) {
      return this.token;
    }

    // Si ya hay una solicitud en curso, esperar
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Solicitar nuevo token
    this.refreshPromise = this.fetchNewToken(deviceId);

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async fetchNewToken(deviceId: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.token = data.token;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);

      console.log('[AuthService] ✅ Token obtenido, expira en', data.expiresIn, 'segundos');
      return this.token;
    } catch (error) {
      console.error('[AuthService] ❌ Error obteniendo token:', error);
      throw error;
    }
  }

  getAuthHeaders(token: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  clearToken(): void {
    this.token = null;
    this.tokenExpiry = 0;
  }
}

export const AuthService = new AuthServiceClass();
