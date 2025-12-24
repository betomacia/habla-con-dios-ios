import type { ConversationMode } from '../services/types';

export function getModeCredits(mode: ConversationMode): number {
  switch (mode) {
    case 'chat':
      return 1.0;
    case 'chat-audio':
      return 2.0;
    case 'video':
      return 4.0;
    case 'video-chat':
      return 4.0;
    default:
      return 1.0;
  }
}

export function canAffordMode(availableCredits: number, mode: ConversationMode): boolean {
  return availableCredits >= getModeCredits(mode);
}
