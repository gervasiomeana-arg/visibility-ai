import test from 'node:test';
import assert from 'node:assert/strict';
import { contentDraftState, contentRequestSignature } from '../../shared/contentDraftState';
const request = { contentType: 'web_page', topic: 'scouting', keyword: 'voleibol', topicRelation: 'Servicio confirmado' };
const profile = { name: 'Open Voley', description: 'Scouting y estadísticas', url: 'https://openvoley.com' };
const signature = contentRequestSignature(request, profile);

test('stored legacy copy is preserved but cannot be mistaken for a newly generated result', () => {
  const state = contentDraftState('Texto anterior', undefined, signature, '', false);
  assert.equal(state.title, 'Borrador anterior guardado');assert.equal(state.canApprove, false);
});
test('a failed new request retains copy while reporting failure and blocking approval', () => {
  const state = contentDraftState('Texto anterior', signature, signature, 'Datos pendientes', false);
  assert.equal(state.title, 'No se generó un nuevo borrador');assert.equal(state.canApprove, false);
});
test('changes to topic or confirmed business facts invalidate the draft; matching input can be approved', () => {
  for (const next of [contentRequestSignature({ ...request, topic: 'Otro tema' }, profile), contentRequestSignature(request, { ...profile, description: 'Otro servicio' })]) {
    assert.equal(contentDraftState('Texto', signature, next, '', false).canApprove, false);
  }
  assert.equal(contentDraftState('Texto', signature, signature, '', false).canApprove, true);
  assert.equal(contentDraftState('Texto', signature, signature, '', true).canApprove, false);
});
