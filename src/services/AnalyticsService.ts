import type { AnalyticsQuestionLog } from './types';
import { AuthService } from './AuthService';

const ANALYTICS_BASE_URL = 'https://backend.movilive.es/api/analytics';

export class AnalyticsService {
  async logQuestion(data: AnalyticsQuestionLog): Promise<boolean> {
    try {
      console.log('[AnalyticsService] 📊 Logging question:', data);

      const token = await AuthService.getToken(data.device_id);
      const response = await fetch(`${ANALYTICS_BASE_URL}/log-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log('[AnalyticsService] ✅ Question logged successfully');
        return true;
      }

      console.warn('[AnalyticsService] ⚠️ Failed to log question:', response.status);
      return false;
    } catch (error) {
      console.error('[AnalyticsService] ❌ Error logging question:', error);
      return false;
    }
  }
}

export const analyticsService = new AnalyticsService();
