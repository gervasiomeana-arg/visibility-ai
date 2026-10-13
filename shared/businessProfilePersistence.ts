import type { Business } from '../src/types';
export async function persistBusinessProfile(workspaceId: string, business: Business,
  write: (fields: Record<string, unknown>, workspaceId: string, businessId: string) => PromiseLike<{ error: unknown; data: unknown }>): Promise<void> {
  if (!workspaceId || !business.id || business.workspaceId !== workspaceId) throw new Error('El perfil no corresponde al espacio de trabajo seleccionado.');
  const { data, error } = await write({
    name: business.name, category: business.category, city: business.city, country: business.country,
    country_code: business.countryCode || 'AR', currency: business.currency || 'USD',
    locale: business.locale || 'es-AR', timezone: business.timezone || 'America/Argentina/Buenos_Aires',
    description: business.description?.trim() || null,
  }, workspaceId, business.id);
  if (error) throw error;
  if (!data) throw new Error('No se confirmó el guardado del perfil. Revisá los permisos de este negocio.');
}
