import type { KeywordItem } from '../src/types';

export async function persistManualKeyword(workspaceId: string, businessId: string, item: KeywordItem,
  write: (row: Record<string, unknown>, options: { onConflict: string }) => PromiseLike<{ error: unknown }>): Promise<void> {
  if (!workspaceId || !businessId || item.businessId !== businessId || item.source !== 'manual' || !item.keyword?.trim()) {
    throw new Error('La palabra clave manual no corresponde al negocio seleccionado.');
  }
  const keyword = item.keyword.trim();
  const { error } = await write({
    workspace_id: workspaceId, business_id: businessId, keyword, source: 'manual',
    payload: { ...item, keyword }, updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id,keyword' });
  if (error) throw error;
}
