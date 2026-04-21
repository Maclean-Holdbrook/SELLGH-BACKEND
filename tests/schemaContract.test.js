import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSchema } from '../src/validators/orderValidator.js';
import { createVendorSchema } from '../src/validators/vendorValidator.js';
import {
  getLegacyVendorPayload,
  getLineItemTotal,
  getPayoutCommissionIds,
  getVendorSubaccountContact,
} from '../src/utils/schemaContract.js';

test('checkout schema accepts the server-owned checkout payload', () => {
  const payload = {
    customer_name: 'Jane Doe',
    customer_email: 'jane@example.com',
    customer_phone: '0240000000',
    shipping_address: '123 Ring Road',
    shipping_city: 'Accra',
    shipping_region: 'Greater Accra',
    payment_method: 'card',
    cart_items: [
      {
        product_id: '11111111-1111-1111-1111-111111111111',
        quantity: 2,
      },
    ],
  };

  const { error, value } = checkoutSchema.validate(payload);
  assert.equal(error, undefined);
  assert.equal(value.cart_items[0].quantity, 2);
});

test('vendor schema accepts legacy frontend vendor onboarding payload', () => {
  const payload = {
    business_name: 'Acme Store',
    business_description: 'This is a vendor profile description with enough characters.',
    business_address: '123 High Street, Accra',
    business_phone: '0240000000',
    business_email: 'vendor@example.com',
    mtn_momo_number: '0240000000',
  };

  const { error } = createVendorSchema.validate(payload);
  assert.equal(error, undefined);
});

test('legacy vendor payload normalizes canonical and alias fields', () => {
  const normalized = getLegacyVendorPayload({
    business_name: 'Acme Store',
    business_description: 'Desc',
    business_phone: '0240000000',
    business_email: 'vendor@example.com',
    business_address: 'Accra',
    vodafone_cash_number: '0200000000',
  });

  assert.equal(normalized.description, 'Desc');
  assert.equal(normalized.business_description, 'Desc');
  assert.equal(normalized.phone, '0240000000');
  assert.equal(normalized.email, 'vendor@example.com');
  assert.equal(normalized.address, 'Accra');
  assert.equal(normalized.momo_provider, 'VODAFONE');
  assert.equal(normalized.momo_number, '0200000000');
});

test('line item total prefers canonical total and falls back to subtotal', () => {
  assert.equal(getLineItemTotal({ total: 40, subtotal: 10 }), 40);
  assert.equal(getLineItemTotal({ subtotal: 15.5 }), 15.5);
  assert.equal(getLineItemTotal({}), 0);
});

test('payout commission ids prefer canonical commission_ids and fall back to order_ids', () => {
  assert.deepEqual(getPayoutCommissionIds({ commission_ids: ['a', 'b'], order_ids: ['c'] }), ['a', 'b']);
  assert.deepEqual(getPayoutCommissionIds({ order_ids: ['c'] }), ['c']);
  assert.deepEqual(getPayoutCommissionIds({}), []);
});

test('vendor subaccount contact prefers canonical fields and preserves legacy support', () => {
  const fromCanonical = getVendorSubaccountContact({
    momo_provider: 'MTN',
    momo_number: '0240000000',
    email: 'a@example.com',
    phone: '0240000000',
  });

  assert.equal(fromCanonical.provider, 'MTN');
  assert.equal(fromCanonical.accountNumber, '0240000000');

  const fromLegacy = getVendorSubaccountContact({
    mobile_money_provider: 'VODAFONE',
    vodafone_cash_number: '0200000000',
    business_email: 'vendor@example.com',
    business_phone: '0200000000',
  });

  assert.equal(fromLegacy.provider, 'VODAFONE');
  assert.equal(fromLegacy.accountNumber, '0200000000');
  assert.equal(fromLegacy.contactEmail, 'vendor@example.com');
});
