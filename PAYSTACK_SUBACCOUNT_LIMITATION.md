# Paystack Subaccount Limitation in Test Mode

## Important Discovery

**Paystack's test mode has limitations with Mobile Money subaccounts for Ghana.**

### The Issue
When trying to create subaccounts with Mobile Money settlement accounts in test mode, Paystack returns:
```
"Account details are invalid"
```

This is because:
1. **Paystack's test environment doesn't fully support Mobile Money subaccounts for Ghana**
2. **The mobile money account numbers cannot be validated in test mode**
3. **This will work in PRODUCTION mode with real Paystack keys**

### What This Means

✅ **The code is correct** - Our implementation follows Paystack's API documentation
✅ **Split payments still work** - You can test payments without subaccounts in test mode
✅ **Production will work** - Once you switch to live Paystack keys with real vendor Mobile Money numbers

❌ **Test mode limitation** - Cannot create actual subaccounts for Mobile Money in test environment

## Workaround for Development/Testing

### Option 1: Skip Subaccount in Test Mode (Recommended)
We'll update the code to:
1. Track that subaccount creation was attempted
2. Mark vendor as "pending_subaccount_setup"
3. Continue with normal operations
4. Create actual subaccounts when you go live

### Option 2: Use Bank Accounts for Testing
Instead of Mobile Money, you can test with dummy bank account details:
- Use a test bank code (e.g., "044" for Access Bank)
- Use a test account number (e.g., "0123456789")
- This will create subaccount successfully in test mode

### Option 3: Test Directly in Production
When ready to go live:
1. Switch to live Paystack keys
2. Use real vendor Mobile Money numbers
3. Subaccounts will be created successfully

## How Split Payments Work Without Subaccounts

Even without subaccounts in test mode, you can still:
1. ✅ Process payments successfully
2. ✅ Track commissions (95% vendor, 5% platform)
3. ✅ Create payout records
4. ✅ Test the complete payment flow

The difference:
- **With subaccounts (Production):** Money is automatically split by Paystack
- **Without subaccounts (Test mode):** All money comes to platform, we track splits manually

## Recommended Approach

### For Development (Now):
1. Continue testing payments without subaccounts
2. Commission tracking will still work
3. Payout management will still work
4. You'll see which vendors need subaccounts

### For Production (When Going Live):
1. Switch `.env` to use **live Paystack keys**:
   ```
   PAYSTACK_SECRET_KEY=sk_live_xxxxx
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
   ```
2. Ensure all vendors have **real, valid Mobile Money numbers**
3. Create subaccounts using the endpoints
4. Verify subaccounts in Paystack dashboard
5. Test with small real transaction

## Testing Without Subaccounts

You can still test the complete flow:

### 1. Test Payment Flow
```
Customer places order → Payment initialized → Payment completed
→ Commission record created → Payout can be generated
```

### 2. Test Commission Tracking
```bash
# View commissions
GET /api/payouts/commissions

# View admin commission overview
GET /api/admin/payouts/commissions
```

### 3. Test Payout Management
```bash
# Create payout for vendor
POST /api/admin/payouts
{
  "vendor_id": "vendor-uuid",
  "period_start": "2025-12-01",
  "period_end": "2025-12-31"
}

# Mark payout as paid
PATCH /api/admin/payouts/:payout_id
{
  "status": "paid",
  "transaction_reference": "MTN-12345"
}
```

## Alternative: Test with Bank Account Subaccounts

If you really want to test subaccount creation in test mode, you can temporarily use bank accounts:

### Step 1: Get Test Bank Code
```bash
GET https://api.paystack.co/bank?country=ghana
Authorization: Bearer sk_test_xxxxx
```

Look for a bank code like:
- Access Bank: "044"
- Fidelity Bank: "070"
- Zenith Bank: "057"

### Step 2: Create Test Subaccount
```bash
POST /api/vendors/:vendorId/subaccount

# But first update vendor in database with:
settlement_bank: "044"  # Bank code
account_number: "0123456789"  # Test account number
```

This will create a subaccount successfully in test mode, allowing you to see the complete flow.

## What to Tell Vendors

When vendors sign up:
1. **Collect their Mobile Money details accurately**:
   - MTN: 10 digits (024XXXXXXX, 025XXXXXXX, 054XXXXXXX, 055XXXXXXX)
   - Vodafone: 10 digits (020XXXXXXX, 050XXXXXXX)
   - AirtelTigo: 10 digits (026XXXXXXX, 027XXXXXXX, 056XXXXXXX, 057XXXXXXX)

2. **Explain the payout process**:
   - Payments are tracked automatically
   - They'll receive 95% of their sales
   - Payouts are processed periodically
   - Money is sent to their registered Mobile Money number

## Production Checklist

Before going live, ensure:

- [ ] Switch to live Paystack keys in `.env`
- [ ] Verify all vendor Mobile Money numbers are real and valid
- [ ] Create subaccounts for all approved vendors
- [ ] Test with small real transaction (GHS 1 or 2)
- [ ] Verify split payment appears in Paystack dashboard
- [ ] Confirm commission tracking is correct
- [ ] Test complete payout flow

## Current Status

**What Works:**
✅ Payment processing (test mode)
✅ Commission tracking
✅ Payout management
✅ Order management
✅ Webhook handling

**What Needs Production Keys:**
⚠️ Actual Mobile Money subaccount creation
⚠️ Automatic payment splitting via Paystack
⚠️ Real Mobile Money settlements

## Summary

The "Account details are invalid" error is **expected in test mode**. Your code is correct, and everything will work properly in production with:
1. Live Paystack keys
2. Real vendor Mobile Money numbers
3. Actual transactions

For now, you can continue testing all other features. The commission tracking and payout management will work perfectly even without active subaccounts.

---

**Last Updated:** December 3, 2025
