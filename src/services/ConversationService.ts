import type { ConversationSaveRequest } from './types';
import { AuthService } from './AuthService';

const CONVERSATION_BASE_URL = 'https://backend.movilive.es/api/conversations';

export class ConversationService {
  async saveConversation(data: ConversationSaveRequest): Promise<void> {
    try {
      console.log('[ConversationService] 💾 Saving conversation:', {
        device_id: data.device_id,
        mode: data.mode,
        credits_used: data.credits_used
      });

      const token = await AuthService.getToken(data.device_id);
      fetch(`${CONVERSATION_BASE_URL}`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(token),
        body: JSON.stringify(data)
      })
        .then(response => {
          if (response.ok) {
            console.log('[ConversationService] ✅ Conversation saved successfully');
          } else {
            console.log('[ConversationService] ⚠️ Conversation save skipped or failed:', response.status);
          }
        })
        .catch(err => {
          console.log('[ConversationService] ❌ Conversation save failed silently:', err);
        });
    } catch (error) {
      console.log('[ConversationService] ❌ Error saving conversation:', error);
    }
  }

  async getConversationHistory(deviceId: string, days: number = 60): Promise<{
    success: boolean;
    messages: Array<{
      user_message: string;
      assistant_message: string;
      mode: string;
      created_at: string;
    }>;
    count: number;
  } | null> {
    try {
      const token = await AuthService.getToken(deviceId);
      const url = `https://backend.movilive.es/api/subscription/chat-history?deviceId=${deviceId}&days=${days}`;
      console.log('[ConversationService] 📜 Cargando historial:', { deviceId, days });

      const response = await fetch(url, {
        method: 'GET',
        headers: AuthService.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ConversationService] ✅ Historial cargado:', {
          count: data.count,
          messages: data.messages?.length
        });
        return data;
      }

      console.warn('[ConversationService] ⚠️ No se pudo cargar historial:', response.status);
      return null;
    } catch (error) {
      console.error('[ConversationService] ❌ Error cargando historial:', error);
      return null;
    }
  }
}

export const conversationService = new ConversationService();
