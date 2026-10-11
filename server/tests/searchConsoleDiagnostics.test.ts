import test from 'node:test';
import assert from 'node:assert/strict';
import { credentialState, propertyMatchesBusiness } from '../../shared/searchConsoleDiagnostics';

test('credentials remain unknown until the server reports a missing list', () => {
  assert.equal(credentialState(null, 'GOOGLE_CLIENT_ID'), 'unknown');
  assert.equal(credentialState({}, 'GOOGLE_CLIENT_ID'), 'unknown');
  assert.equal(credentialState({ missing: ['GOOGLE_CLIENT_ID'] }, 'GOOGLE_CLIENT_ID'), 'missing');
  assert.equal(credentialState({ missing: [] }, 'GOOGLE_CLIENT_ID'), 'configured');
});

test('domain properties match the business and its subdomains, not unrelated lookalikes', () => {
  assert.equal(propertyMatchesBusiness('sc-domain:openvoley.com', 'https://openvoley.com/'), true);
  assert.equal(propertyMatchesBusiness('sc-domain:openvoley.com', 'https://www.openvoley.com/'), true);
  assert.equal(propertyMatchesBusiness('sc-domain:other-openvoley.com', 'https://openvoley.com/'), false);
  assert.equal(propertyMatchesBusiness('sc-domain:openvoley.com.evil.test', 'https://openvoley.com/'), false);
  assert.equal(propertyMatchesBusiness('sc-domain:', 'https://openvoley.com/'), false);
  assert.equal(propertyMatchesBusiness('sc-domain:openvoley.com', ''), false);
});

test('URL prefix properties respect protocol, hostname and path', () => {
  assert.equal(propertyMatchesBusiness('https://openvoley.com/', 'https://openvoley.com/scouting'), true);
  assert.equal(propertyMatchesBusiness('http://openvoley.com/', 'https://openvoley.com/'), false);
  assert.equal(propertyMatchesBusiness('https://other.test/openvoley.com/', 'https://openvoley.com/'), false);
  assert.equal(propertyMatchesBusiness('https://openvoley.com/club/', 'https://openvoley.com/'), false);
  assert.equal(propertyMatchesBusiness('https://openvoley.com/club/', 'https://openvoley.com/club/stats'), true);
});
