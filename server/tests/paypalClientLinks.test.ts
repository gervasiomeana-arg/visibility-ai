import test from 'node:test';
import assert from 'node:assert/strict';
import { clientDateTime, paypalLink, paypalPaymentRequest, type ClientAccount } from '../../shared/clientLedger';
const client: ClientAccount = {id:'own',workspaceId:'agency',name:'Cliente de prueba',kind:'Empresa',country:'Uruguay',email:'',whatsapp:'',businessIds:[],monthlyFeeCents:2000,currency:'USD',dueDay:10,invoices:[{id:'oct',period:'2026-10',dueOn:'2026-10-10',amountCents:2000,currency:'USD',createdAt:'2026-10-13'}],payments:[{id:'partial',invoiceId:'oct',amountCents:1000,paidAt:'2026-10-13',recordedAt:'2026-10-13',method:'Prueba'}],reports:[],paypalPaymentUrl:'https://paypal.me/ejemplo'};
test('PayPal links allow only exact HTTPS PayPal domains and reject credentials or deceptive hosts',()=>{
  assert.equal(paypalLink(' https://paypal.me/ejemplo '),'https://paypal.me/ejemplo');
  assert.equal(paypalLink('https://www.paypal.com/ncp/payment/EXAMPLE'),'https://www.paypal.com/ncp/payment/EXAMPLE');
  assert.equal(paypalLink(undefined),'');
  for(const value of ['javascript:alert(1)','http://paypal.me/ejemplo','https://paypal.me.evil.example/name','https://paypal.com@evil.example/name','https://user:secret@paypal.com/pay','https://paypal.me/','https://paypal.com:444/pay'])assert.throws(()=>paypalLink(value));
});
test('copied payment request uses the remaining invoice amount and original currency without claiming payment or automatic billing',()=>{
  const text=paypalPaymentRequest({...client,currency:'EUR'},'oct','2026-10-13');
  assert.ok(text.includes('10,00 USD'));assert.ok(text.includes('2026-10'));assert.ok(text.includes(client.paypalPaymentUrl!));
  assert.ok(text.includes('destinatario, importe y moneda'));
  assert.throws(()=>paypalPaymentRequest(client,'foreign','2026-10-13'));
  assert.throws(()=>paypalPaymentRequest({...client,paypalPaymentUrl:''},'oct','2026-10-13'));
  assert.throws(()=>paypalPaymentRequest({...client,payments:[{...client.payments[0],amountCents:2000}]},'oct','2026-10-13'));
});
test('payment and sending timestamps display 24-hour time in the configured workspace timezone',()=>{
  const date='2026-10-14T00:35:00Z';
  assert.ok(clientDateTime(date,'America/Argentina/Buenos_Aires').includes('21:35:00'));
  assert.ok(clientDateTime(date,'UTC').includes('00:35:00'));
  assert.equal(clientDateTime('bad','UTC'),'Sin fecha válida');
});
