const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatPhoneNumber, validateSignup } = require('./load-typescript.cjs')('lib/auth-forms.ts');
const today = '2026-11-12';
const input = { fullName:'회원', username:'member', phoneNumber:'010-1234-5678', address:'서울특별시', birthDate:'1998-01-20', password:'test-password', passwordConfirmation:'test-password' };
test('complete signup details pass without changing password content', () => {
  assert.equal(validateSignup(input,today),null);
  assert.equal(validateSignup({ ...input, password:' a b ', passwordConfirmation:' a b ' },today),null);
});
test('whitespace-only required values are rejected', () => {
  for(const field of ['fullName','username','phoneNumber','birthDate','password']) assert.equal(validateSignup({ ...input, [field]:'   ' },today).field,field);
});
test('signup requires searched address and matching confirmation', () => {
  assert.equal(validateSignup({ ...input, address:'' },today).field,'address');
  assert.equal(validateSignup({ ...input, passwordConfirmation:'different' },today).field,'passwordConfirmation');
});
test('invalid and future birthdays are rejected', () => {
  for(const birthDate of ['2026-02-30','2025-02-29','invalid','2026-11-13']) assert.equal(validateSignup({ ...input, birthDate },today).field,'birthDate');
  assert.equal(validateSignup({ ...input, birthDate:'2024-02-29' },today),null);
  assert.equal(validateSignup({ ...input, birthDate:today },today),null);
});
test('phone formatting supports mobile and Seoul landline numbers', () => {
  assert.equal(formatPhoneNumber('01012345678'),'010-1234-5678');
  assert.equal(formatPhoneNumber('0101234567'),'010-123-4567');
  assert.equal(formatPhoneNumber('0231234567'),'02-3123-4567');
  assert.equal(formatPhoneNumber('021234567'),'02-123-4567');
  assert.equal(formatPhoneNumber('010-1234-567899'),'010-1234-5678');
  assert.equal(formatPhoneNumber('text'),'');
});
