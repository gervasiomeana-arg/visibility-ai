/** Stable diagnostics only: database messages may contain private values and are never exposed. */
export function socialStorageFailure(error: unknown): string {
  const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
  if (['42P01', 'PGRST205', '42703', 'PGRST204'].includes(code)) {
    return 'La estructura de Redes no está disponible o está desactualizada en Supabase. Aplicá la migración 202610150001_business_social_accounts.sql en el proyecto de Visibility y reintentá. No se guardaron cambios.';
  }
  if (code === '42501') return 'Supabase rechazó el acceso a Redes. Comprobá que seas propietario del espacio y que estén aplicadas las políticas de Redes. No se guardaron cambios.';
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(code)) return 'La sesión de Supabase venció o no es válida. Volvé a ingresar a Visibility y reintentá Redes.';
  if (code === '23505') return 'Este perfil ya fue guardado en otra consulta. Recargá Redes antes de editarlo para conservar la última versión.';
  if (code === '23503') return 'No se pudo asociar el perfil con este negocio y espacio. Recargá los negocios y seleccioná el correcto antes de reintentar.';
  return 'No se pudo confirmar la operación de Redes. Revisá la conexión y reintentá; no se confirmó ningún cambio. Si persiste, revisá los registros de Supabase.';
}
