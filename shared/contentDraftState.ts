export function contentRequestSignature(request: Record<string, unknown>, profile: { name?: string; description?: string; url?: string }): string {
  return JSON.stringify([
    ...['contentType', 'topic', 'keyword', 'city', 'businessType', 'goal', 'tone', 'topicRelation'].map(key => request[key] ?? ''),
    profile.name ?? '', profile.description ?? '', profile.url ?? '',
  ]);
}

export function contentDraftState(text: string, generatedFor: string | undefined, currentSignature: string, error: string, generating: boolean) {
  const outdated = Boolean(text && (!generatedFor || generatedFor !== currentSignature));
  const title = generating ? 'Generando un nuevo borrador…' : error ? 'No se generó un nuevo borrador'
    : outdated ? 'Borrador anterior guardado' : text ? 'Borrador actual · editable' : 'Resultado editable';
  return { outdated, title, canApprove: Boolean(text && !outdated && !generating && !error) };
}
