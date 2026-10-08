import {
  SupportedCountryCode,
  SupportedCurrency,
  SupportedLocale,
  SubscriptionPlanId,
} from '../types';

export interface MarketConfig {
  countryCode: SupportedCountryCode;
  country: string;
  currency: SupportedCurrency;
  locale: SupportedLocale;
  timezone: string;
}

export const MARKET_CONFIGS: MarketConfig[] = [
  { countryCode: 'AR', country: 'Argentina', currency: 'USD', locale: 'es-AR', timezone: 'America/Argentina/Buenos_Aires' },
  { countryCode: 'CL', country: 'Chile', currency: 'USD', locale: 'es-CL', timezone: 'America/Santiago' },
  { countryCode: 'MX', country: 'México', currency: 'USD', locale: 'es-MX', timezone: 'America/Mexico_City' },
  { countryCode: 'ES', country: 'España', currency: 'EUR', locale: 'es-ES', timezone: 'Europe/Madrid' },
  { countryCode: 'CO', country: 'Colombia', currency: 'USD', locale: 'es-CO', timezone: 'America/Bogota' },
  { countryCode: 'US', country: 'Estados Unidos · Hispano', currency: 'USD', locale: 'es-US', timezone: 'America/New_York' },
];

export interface PlanConfig {
  id: SubscriptionPlanId;
  name: string;
  monthlyPrice: number | null;
  currency: 'USD' | 'EUR';
  maxBusinesses: number;
  features: string[];
}

export const BASE_PLANS: PlanConfig[] = [
  {
    id: 'diagnostic',
    name: 'Diagnóstico',
    monthlyPrice: null,
    currency: 'USD',
    maxBusinesses: 1,
    features: ['Auditoría puntual', 'Resumen ejecutivo', 'Problemas y oportunidades principales'],
  },
  {
    id: 'monitor',
    name: 'Visibility Monitor',
    monthlyPrice: 69,
    currency: 'USD',
    maxBusinesses: 1,
    features: ['Auditoría mensual', 'Historial', 'PageSpeed', 'Informe mensual'],
  },
  {
    id: 'growth',
    name: 'Visibility Growth',
    monthlyPrice: 149,
    currency: 'USD',
    maxBusinesses: 1,
    features: ['Search Console', 'Keywords reales', 'Oportunidades', 'Plan de acción', 'IA'],
  },
  {
    id: 'pro',
    name: 'Visibility PRO Gestionado',
    monthlyPrice: 299,
    currency: 'USD',
    maxBusinesses: 3,
    features: ['Todo Growth', 'Seguimiento gestionado', 'Optimización y contenido asistido'],
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 599,
    currency: 'USD',
    maxBusinesses: 30,
    features: ['Multi-cliente', 'Marca blanca', 'Informes', 'Administración centralizada'],
  },
];

export function getMarket(countryCode?: SupportedCountryCode): MarketConfig {
  return MARKET_CONFIGS.find((market) => market.countryCode === countryCode) || MARKET_CONFIGS[0];
}

export function getPlanPrice(plan: PlanConfig, countryCode?: SupportedCountryCode) {
  if (plan.monthlyPrice === null) return null;
  if (countryCode === 'ES') {
    return { amount: plan.monthlyPrice, currency: 'EUR' as const };
  }
  return { amount: plan.monthlyPrice, currency: 'USD' as const };
}
