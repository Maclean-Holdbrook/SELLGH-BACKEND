# Testing Guide - Priority 1 Features

## Prerequisites

Before testing, ensure:
- ✅ Database migration completed successfully
- ✅ Both frontend and backend servers are running
- ✅ Environment variables are set (PAYSTACK_SECRET_KEY, RESEND_API_KEY, etc.)

**Server URLs:**
- Frontend: http://localhost:5174
- Backend: http://localhost:5000

---

## Test 1: Vendor Approval & Subaccount Creation

### Step 1: Create a Vendor Account
1. Open http://localhost:5174
2. Click **Sign Up** or **Become a Vendor**
3. Create a new account with email/password
4. Fill in the vendor registration form:
   - Business name: "Test Vendor Store"
   - Business description: "Test store for verification"
   - Business address: "123 Test Street, Accra"
   - Phone: "0241234567"
   - **Mobile Money Number**: "0241234567" (Important!)
   - **Mobile Money Provider**: Select MTN/Vodafone/AirtelTigo
   - Mobile Money Name: "John Doe"

5. Submit the form
6. You should see a pending approval message

### Step 2: Approve Vendor as Admin
1. In a new incognito/private window, go to http://localhost:5174/sellgh-admin
2. Login with admin credentials
3. Go to **Vendors** or **Dashboard** → **Pending Vendor Approvals**
4. Find the vendor you just created
5. Click **Approve**

### Step 3: Check Backend Logs
Look for these messages in your backend terminal:
```
Creating Paystack subaccount for vendor: Test Vendor Store
Subaccount created successfully: ACCT_xxxxxxxxx
```

### Step 4: Verify in Database
Go to Supabase Dashboard → Table Editor → `vendors` table
- Find your vendor record
- Check that `paystack_subaccount_code` is filled (should start with "ACCT_")
- Check that `paystack_subaccount_id` has a number
- Check that `subaccount_created_at` has a timestamp

**✅ Test Passes If:**
- Backend logs show subaccount creation
- Database has subaccount code saved
- No errors in console

---

## Test 2: Payment Flow & Commission Tracking

### Step 1: Add Products (as Vendor)
1. Login as the vendor you just created
2. Go to Vendor Dashboard
3. Add at least 2-3 products with prices
4. Make sure products are active

### Step 2: Place an Order (as Customer)
1. Open a new incognito window or logout
2. Go to http://localhost:5174
3. Browse products and add some to cart
4. Go to **Cart** → **Checkout**
5. Fill in shipping details:
   - Name: "Test Customer"
   - Phone: "0501234567"
   - Address: "456 Customer Street"
   - City: "Kumasi"
   - Region: "Ashanti"
6. Click **Proceed to Payment**

### Step 3: Complete Payment
**Option A: Test with Paystack Test Cards**
```
Card Number: 4084 0840 8408 4081
Expiry: 12/25
CVV: 408
PIN: 0000
OTP: 123456
```

**Option B: Skip payment (for testing only)**
You can manually update the order in Supabase:
1. Go to Supabase → `orders` table
2. Find your order
3. Update:
   - `payment_status` = 'paid'
   - `status` = 'confirmed'
4. Manually trigger the webhook handler

### Step 4: Check Backend Logs
After successful payment, look for:
```
✅ Payment successful! Updating order: [order-id]
✅ Order updated to paid status
📧 Order confirmation sent
📧 Vendor notification sent
💰 Commission record created
Payment successful for order: ORD-xxxxx
```

### Step 5: Verify Commissions in Database
Go to Supabase → `commissions` table
- Should see a new record for each vendor in the order
- Check calculations:
  - If vendor items = GH₵ 100
  - `platform_commission` should be GH₵ 5.00 (5%)
  - `vendor_amount` should be GH₵ 95.00 (95%)
- Check `status` is 'pending'
- Check `payment_reference` matches the order

**✅ Test Passes If:**
- Commission records created
- Calculations are correct (5%/95% split)
- All fields populated correctly

---

## Test 3: Email Notifications

### Prerequisites
Make sure these are set in `.env`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=SellGH <orders@yourdomain.com>
FRONTEND_URL=http://localhost:5174
```

### Step 1: Check Customer Email
After placing an order and payment succeeds:
1. Check the customer's email inbox
2. Should receive **"Order Confirmed"** email with:
   - Order number
   - Order items and quantities
   - Total amount
   - Shipping address
   - "View Order" button

### Step 2: Check Vendor Email
1. Check the vendor's email inbox
2. Should receive **"New Order Received"** email with:
   - Order number
   - Customer name and details
   - Their items from the order (not all items if multi-vendor)
   - Shipping details
   - "Manage Orders" button

### Step 3: Test Status Update Email
1. Login as vendor
2. Go to Orders
3. Update an order status to "Shipped"
4. Customer should receive **"Order Shipped"** email

**✅ Test Passes If:**
- Customer receives order confirmation
- Vendor receives new order notification
- Status update emails work
- All information is correct in emails

---

## Test 4: Multi-Vendor Order

### Step 1: Create Multiple Vendors
1. Create 2-3 different vendor accounts
2. Approve all of them (check subaccounts created)
3. Each vendor adds products

### Step 2: Place Order with Multiple Vendors
1. As customer, add products from different vendors to cart
2. Complete checkout and payment

### Step 3: Verify Commission Split
Go to Supabase → `commissions` table
- Should see **multiple commission records** (one per vendor)
- Each vendor's commission calculated separately
- Total of all `platform_commission` = 5% of order total

**Example:**
- Vendor A items: GH₵ 50 → Commission: GH₵ 2.50
- Vendor B items: GH₵ 30 → Commission: GH₵ 1.50
- Total commission: GH₵ 4.00 (5% of GH₵ 80)

### Step 4: Check Vendor Emails
- Each vendor receives email with only THEIR items
- Not all items from the order

**✅ Test Passes If:**
- Separate commission records for each vendor
- Calculations correct per vendor
- Each vendor gets appropriate notification

---

## Test 5: Admin Commission Reports

### View Commissions
1. Login as admin
2. You can query commissions using Supabase Dashboard or create admin UI

**SQL Query to check total commissions:**
```sql
SELECT
    SUM(platform_commission) as total_commission,
    COUNT(*) as total_orders,
    payment_method,
    status
FROM commissions
GROUP BY payment_method, status;
```

**SQL Query for vendor earnings:**
```sql
SELECT
    v.business_name,
    SUM(c.vendor_amount) as total_earnings,
    SUM(c.platform_commission) as commission_paid,
    COUNT(c.id) as order_count
FROM commissions c
JOIN vendors v ON c.vendor_id = v.id
WHERE c.status = 'pending'
GROUP BY v.id, v.business_name
ORDER BY total_earnings DESC;
```

---

## Troubleshooting

### Subaccount Not Created
**Problem:** Vendor approved but no subaccount_code
**Check:**
1. Backend logs for errors
2. Vendor has mobile money number filled
3. PAYSTACK_SECRET_KEY is set correctly
4. Internet connection working

**Fix:** Run this to create manually:
```javascript
// In backend console or create admin endpoint
await paystackService.createSubaccount({
  business_name: "Vendor Name",
  account_number: "0241234567",
  settlement_bank: "MTN",
  percentage_charge: 5,
  primary_contact_email: "vendor@email.com",
  primary_contact_name: "Vendor Name",
  primary_contact_phone: "0241234567"
});
```

### Commission Not Created
**Problem:** Payment successful but no commission record
**Check:**
1. Backend webhook logs
2. `commissions` table exists
3. Order has order_items with vendor_id

**Fix:** Manually create commission:
```sql
INSERT INTO commissions (
    order_id, vendor_id, order_total,
    vendor_amount, platform_commission,
    status, payment_reference
) VALUES (
    '[order-id]', '[vendor-id]', 100.00,
    95.00, 5.00, 'pending', '[payment-ref]'
);
```

### Emails Not Sending
**Problem:** No emails received
**Check:**
1. `RESEND_API_KEY` is set
2. `EMAIL_FROM` is configured
3. Backend logs show email sent
4. Check spam folder

**Test email service:**
```javascript
// Test in backend
await emailService.sendOrderConfirmation(order, orderItems);
```

### Paystack Test Mode
Make sure you're using TEST keys:
```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxx  # NOT sk_live_
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxx  # NOT pk_live_
```

---

## Success Checklist

After completing all tests, verify:

- [ ] Vendor approval creates Paystack subaccount
- [ ] Subaccount code saved in database
- [ ] Payment creates commission records
- [ ] Commission calculation correct (5%/95%)
- [ ] Customer receives order confirmation email
- [ ] Vendor receives new order notification email
- [ ] Status update emails work
- [ ] Multi-vendor orders create separate commissions
- [ ] Each vendor gets their items only in email
- [ ] No errors in backend logs
- [ ] No errors in frontend console

---

## Next Steps After Testing

1. **If all tests pass:** ✅ Move to Priority 2 features
2. **If issues found:** 🐛 Debug and fix before proceeding
3. **Production readiness:**
   - Switch to live Paystack keys
   - Set up production email domain
   - Test with real mobile money numbers

---

## Quick Test Commands

### Check if subaccount exists for vendor:
```sql
SELECT business_name, paystack_subaccount_code, subaccount_created_at
FROM vendors
WHERE paystack_subaccount_code IS NOT NULL;
```

### View all commissions:
```sql
SELECT * FROM commissions ORDER BY created_at DESC LIMIT 10;
```

### Check total platform earnings:
```sql
SELECT SUM(platform_commission) as total_commission FROM commissions;
```

### View pending vendor payouts:
```sql
SELECT
    v.business_name,
    SUM(c.vendor_amount) as pending_payout
FROM commissions c
JOIN vendors v ON c.vendor_id = v.id
WHERE c.status = 'pending'
GROUP BY v.business_name;
```

---

**Happy Testing! 🚀**
