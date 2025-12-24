// ============================================
// WELCOMESERVICE.TS - LÓGICA DE BIENVENIDA
// ============================================

import type { Language, WelcomeResponse } from './types';
import { AuthService } from './AuthService';

export class WelcomeService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Obtener mensaje de bienvenida del backend
   */
  async getWelcome(
    language: Language,
    name: string,
    gender: "male" | "female",
    deviceId: string,
    mode?: string,
    sessionId?: string
  ): Promise<WelcomeResponse | null> {
    try {
      console.log(`[Welcome] 📞 Solicitando bienvenida: ${name} (${language})`);
      console.log(`[Welcome] 🌐 URL: ${this.baseUrl}/api/welcome`);

      const payload = {
        lang: language,
        name,
        gender,
        hour: new Date().getHours(),
        localDate: new Date().toLocaleDateString('en-CA'),
        deviceId,
        ...(mode && { mode }),
        ...(sessionId && { sessionId }),
      };
      console.log('[Welcome] 📦 Payload:', JSON.stringify(payload));

      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`${this.baseUrl}/api/welcome`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      console.log(`[Welcome] 📡 Response status: ${response.status}`);
      console.log(`[Welcome] 📡 Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error text');
        console.error(`[Welcome] ❌ HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Welcome] ✅ Respuesta recibida:', JSON.stringify(data).substring(0, 200));

      const result = {
        message: data.message || '',
        response: data.response || '',
        bible: data.bible || { text: '', ref: '' },
        question: data.question || '',
        // ✅ Usar el sessionId que enviamos, no generar uno nuevo
        sessionId: sessionId || data.sessionId || '',
      };

      console.log('[Welcome] 📝 Result formatted:', JSON.stringify(result).substring(0, 200));
      return result;
    } catch (error) {
      console.error('[Welcome] ❌ Error completo:', error);
      console.error('[Welcome] ❌ Error tipo:', error instanceof Error ? error.message : String(error));
      console.error('[Welcome] ❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      return null;
    }
  }

  /**
   * Formatear texto de bienvenida completo
   */
  formatWelcomeText(welcome: WelcomeResponse): string {
    const parts = [
      welcome.message,
      welcome.question
    ].filter(Boolean);
    
    return parts.join('\n\n').trim();
  }

  /**
   * Obtener texto de bienvenida fallback según idioma
   */
  getFallbackWelcome(language: Language): string {
    const fallbacks: Record<Language, string> = {
      es: "Hola. ¿Qué te gustaría compartir hoy?",
      en: "Hello. What would you like to share today?",
      pt: "Olá. O que você gostaria de compartilhar hoje?",
      it: "Ciao. Cosa vorresti condividere oggi?",
      de: "Hallo. Was möchten Sie heute teilen?",
      fr: "Bonjour. Que souhaitez-vous partager aujourd'hui?",
    };
    
    return fallbacks[language] || fallbacks.es;
  }

  /**
   * Formatear hora del día para saludo
   */
  getGreetingByHour(hour: number, language: Language): string {
    const greetings: Record<Language, { morning: string; afternoon: string; evening: string }> = {
      es: { morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches" },
      en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
      pt: { morning: "Bom dia", afternoon: "Boa tarde", evening: "Boa noite" },
      it: { morning: "Buongiorno", afternoon: "Buon pomeriggio", evening: "Buonasera" },
      de: { morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend" },
      fr: { morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonsoir" },
    };

    const timeOfDay = 
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 20 ? 'afternoon' : 'evening';

    return greetings[language][timeOfDay];
  }
}