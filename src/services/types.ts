import type { Language } from '../App';

// ===== TIPOS DE SUSCRIPCIÓN =====

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price?: number; // Opcional: se carga dinámicamente
  currency?: string; // Opcional: se carga dinámicamente
  localizedPrice?: string; // Precio formateado con símbolo de moneda
  credits: number;
  billingPeriod: 'monthly';
  features: string[];
  popular?: boolean;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  creditsRemaining: number;
  creditsTotal: number;
  totalPurchasedCredits?: number;
  creditsSubscription?: number;
  creditsExtra?: number;
  expiresAt: string | null;
  isActive: boolean;
  renewalDate?: string;
  cancelAtPeriodEnd?: boolean;
  userName?: string;
  gender?: string;
  language?: string;
  lastMode?: ConversationMode;
  hasPlan?: boolean;
}

// ===== PLANES DISPONIBLES =====

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    tier: 'free',
    name: 'Free',
    credits: 12,
    billingPeriod: 'monthly',
    features: ['3 preguntas con Jesús + Chat', 'Una sola vez por dispositivo'],
  },
  basic: {
    id: 'basic_monthly',
    tier: 'basic',
    name: 'Basic',
    credits: 300,
    billingPeriod: 'monthly',
    features: ['300 créditos/mes', 'Todos los modos', 'Renovación automática'],
  },
  standard: {
    id: 'standard_monthly',
    tier: 'standard',
    name: 'Standard',
    credits: 600,
    billingPeriod: 'monthly',
    features: ['600 créditos/mes', 'Todos los modos', 'Renovación automática'],
    popular: true,
  },
  premium: {
    id: 'premium_monthly',
    tier: 'premium',
    name: 'Premium',
    credits: 1200,
    billingPeriod: 'monthly',
    features: ['1200 créditos/mes', 'Todos los modos', 'Renovación automática', 'Soporte prioritario'],
  },
};

// ===== COSTOS POR MODO =====

export type ConversationMode = 'chat' | 'chat-audio' | 'video' | 'video-chat';

export const CREDITS_PER_MODE: Record<ConversationMode, number> = {
  'chat': 1,           // Solo chat = 1 crédito
  'chat-audio': 2,     // Chat + Audio = 2 créditos
  'video': 4,          // Solo Jesús (video) = 4 créditos
  'video-chat': 4,     // Jesús + Chat = 4 créditos
};

// ===== RESPUESTAS DE API =====

export interface SubscriptionResponse {
  success: boolean;
  subscription?: SubscriptionStatus;
  error?: string;
}

export interface PurchaseRequest {
  deviceId: string;
  planId: string;
  paymentToken?: string; // Token de Google Play / App Store
}

export interface PurchaseResponse {
  success: boolean;
  subscription?: SubscriptionStatus;
  error?: string;
  transactionId?: string;
}

export interface CreditCheckResponse {
  hasCredits: boolean;
  creditsRemaining: number;
  subscription: SubscriptionStatus;
}

// ===== WELCOME SERVICE =====

export interface WelcomeData {
  message: string;
  question?: string;
  hour?: number;
}

export interface WelcomeRequest {
  lang: Language;
  name: string;
  gender: 'male' | 'female';
  hour: number;
}

export interface WelcomeResponse {
  message: string;
  response: string;
  bible: {
    text: string;
    ref: string;
  };
  question: string;
  sessionId: string;
}

// ===== ANALYTICS SERVICE =====

export interface AnalyticsQuestionLog {
  device_id: string;
  language: string;
  mode_used: ConversationMode;
  credits_consumed: number;
  subscription_tier: SubscriptionTier;
  response_time: number;
  question_text?: string;
  response_text?: string;
}

// ===== CONVERSATION SERVICE =====

export interface ConversationSaveRequest {
  device_id: string;
  user_message: string;
  assistant_message: string;
  language: string;
  mode: ConversationMode;
  credits_used: number;
  session_id?: string;
  bible?: {
    text: string;
    ref: string;
  };
  client_timestamp?: string;
}