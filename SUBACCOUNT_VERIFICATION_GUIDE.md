# Paystack Subaccount Verification Guide

## Overview
This guide explains how to verify that Paystack subaccounts are created for vendors when you approve them.

## How Subaccounts Are Created

### Automatic Creation (During Vendor Approval)
When you approve a vendor through the admin panel, the system automatically:
1. Checks if vendor has a Mobile Money number (MTN, Vodafone, or AirtelTigo)
2. Creates a Paystack subaccount with 5% platform commission
3. Saves the subaccount code in the vendor's profile
4. Returns detailed status in the API response

### API Response Example
When you approve a vendor, you'll receive:
```json
{
  "vendor": {
    "id": "vendor-uuid",
    "business_name": "Vendor Name",
    "paystack_subaccount_code": "ACCT_xxxxxxxxxxxxx",
    "paystack_subaccount_id": 12345,
    "subaccount_created_at": "2025-12-03T08:00:00.000Z",
    ...
  },
  "subaccount_status": {
    "created": true,
    "subaccount_code": "ACCT_xxxxxxxxxxxxx",
    "created_at": "2025-12-03T08:00:00.000Z"
  },
  "message": "Vendor verified and Paystack subaccount created successfully"
}
```

## New API Endpoints for Verification

### 1. Check Vendor's Subaccount Status
**Endpoint:** `GET /api/vendors/:vendorId/subaccount`

**Purpose:** Check if a vendor has a Paystack subaccount and view its details

**Example Request:**
```bash
GET http://localhost:5000/api/vendors/vendor-uuid-here/subaccount
```

**Example Response (With Subaccount):**
```json
{
  "success": true,
  "vendor_id": "vendor-uuid",
  "business_name": "Phone Shop",
  "has_subaccount": true,
  "subaccount": {
    "code": "ACCT_xxxxxxxxxxxxx",
    "id": 12345,
    "created_at": "2025-12-03T08:00:00.000Z",
    "paystack_details": {
      "business_name": "Phone Shop",
      "account_number": "024xxxxxxx",
      "percentage_charge": 5,
      "settlement_bank": "MTN Mobile Money",
      "currency": "GHS",
      "active": true
    }
  }
}
```

**Example Response (Without Subaccount):**
```json
{
  "success": true,
  "vendor_id": "vendor-uuid",
  "business_name": "Phone Shop",
  "has_subaccount": false,
  "message": "No subaccount created for this vendor",
  "mobile_money_numbers": {
    "mtn": "024xxxxxxx",
    "vodafone": null,
    "airteltigo": null
  }
}
```

### 2. Manually Create Subaccount for Vendor
**Endpoint:** `POST /api/vendors/:vendorId/subaccount`

**Purpose:** Create a Paystack subaccount for a vendor who was approved but doesn't have one

**Use Cases:**
- Vendor was approved before Mobile Money details were added
- Subaccount creation failed during approval
- Vendor updated their Mobile Money number

**Example Request:**
```bash
POST http://localhost:5000/api/vendors/vendor-uuid-here/subaccount
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Paystack subaccount created successfully",
  "vendor": {
    "id": "vendor-uuid",
    "business_name": "Phone Shop",
    "paystack_subaccount_code": "ACCT_xxxxxxxxxxxxx",
    ...
  },
  "subaccount": {
    "code": "ACCT_xxxxxxxxxxxxx",
    "id": 12345,
    "settlement_bank": "MTN",
    "account_number": "024xxxxxxx",
    "percentage_charge": 5
  }
}
```

**Example Response (Error - No Mobile Money):**
```json
{
  "success": false,
  "error": "No Mobile Money number found for vendor",
  "hint": "Please update vendor profile with MTN, Vodafone, or AirtelTigo number"
}
```

## Verification Workflows

### Workflow 1: Approve New Vendor (Normal Flow)
1. Admin views pending vendor in admin panel
2. Admin approves vendor: `PUT /api/vendors/:vendorId/verify`
   ```json
   {
     "is_verified": true,
     "verification_status": "approved"
   }
   ```
3. System checks response:
   - ✅ `subaccount_status.created: true` → Subaccount created successfully
   - ❌ `subaccount_status.created: false` → Check warning message

4. If subaccount not created, check vendor's Mobile Money details
5. Add/Update Mobile Money number in vendor profile
6. Manually create subaccount: `POST /api/vendors/:vendorId/subaccount`

### Workflow 2: Verify Existing Vendors
For vendors who were approved before this feature:

1. Get list of all approved vendors:
   ```bash
   GET /api/vendors?status=approved
   ```

2. For each vendor, check subaccount status:
   ```bash
   GET /api/vendors/:vendorId/subaccount
   ```

3. If `has_subaccount: false`:
   - Check if vendor has Mobile Money number
   - If yes, create subaccount: `POST /api/vendors/:vendorId/subaccount`
   - If no, notify vendor to add Mobile Money details

### Workflow 3: Troubleshooting Failed Creation

**Console Logs to Check:**
Look in the backend server logs for these messages:

✅ **Success:**
```
Creating Paystack subaccount for vendor: Vendor Name
Subaccount created successfully: ACCT_xxxxxxxxxxxxx
```

❌ **Failure:**
```
Creating Paystack subaccount for vendor: Vendor Name
Failed to create subaccount: [error message]
```

**Common Errors:**

1. **"Account details are invalid"**
   - **Cause:** Invalid Mobile Money number format
   - **Solution:** Verify Mobile Money number is 10 digits (e.g., 0241234567)
   - **Note:** Paystack validates Mobile Money numbers in test mode

2. **"No mobile money number found"**
   - **Cause:** Vendor profile missing Mobile Money details
   - **Solution:** Update vendor profile with MTN/Vodafone/AirtelTigo number

3. **"Vendor must be approved before creating subaccount"**
   - **Cause:** Trying to create subaccount for pending/rejected vendor
   - **Solution:** Approve vendor first

4. **"Vendor already has a Paystack subaccount"**
   - **Cause:** Subaccount already exists
   - **Solution:** No action needed, use existing subaccount

## Checking in Paystack Dashboard

You can also verify subaccounts directly in Paystack:

1. Login to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to **Settings** → **Subaccounts**
3. Search for vendor's business name
4. Verify:
   - ✅ Percentage charge is set to **5%**
   - ✅ Settlement account matches vendor's Mobile Money number
   - ✅ Status is **Active**

## Database Verification

You can also check directly in Supabase:

```sql
-- Check all vendors with subaccounts
SELECT
  id,
  business_name,
  paystack_subaccount_code,
  subaccount_created_at,
  verification_status
FROM vendors
WHERE verification_status = 'approved'
ORDER BY subaccount_created_at DESC;

-- Check vendors without subaccounts
SELECT
  id,
  business_name,
  mtn_momo_number,
  vodafone_cash_number,
  airteltigo_number,
  verification_status
FROM vendors
WHERE verification_status = 'approved'
  AND paystack_subaccount_code IS NULL;
```

## Testing Split Payments

After verifying subaccounts are created:

1. **Place Test Order:**
   - Customer places order with products from vendor
   - Payment is initialized with split configuration

2. **Check Payment Initialization:**
   Look for split payment in the payment data:
   ```json
   {
     "subaccount": "ACCT_xxxxxxxxxxxxx",
     "split": [
       {
         "subaccount": "ACCT_xxxxxxxxxxxxx",
         "share": 9500  // 95% in pesewas
       }
     ]
   }
   ```

3. **Complete Payment:**
   - Use Paystack test card: `5060 6666 6666 6666 666`
   - PIN: `123`
   - OTP: `123456`

4. **Verify Commission:**
   Check commission record was created:
   ```bash
   GET /api/payouts/commissions
   ```

## Quick Reference

| Task | Endpoint | Method |
|------|----------|--------|
| Approve vendor (auto-create subaccount) | `/api/vendors/:vendorId/verify` | PUT |
| Check subaccount status | `/api/vendors/:vendorId/subaccount` | GET |
| Manually create subaccount | `/api/vendors/:vendorId/subaccount` | POST |
| View vendor commissions | `/api/payouts/commissions` | GET |
| View all commissions (admin) | `/api/admin/payouts/commissions` | GET |

## Integration with Frontend

To display subaccount status in your admin panel:

```javascript
// When displaying vendor details
const checkSubaccount = async (vendorId) => {
  const response = await fetch(
    `http://localhost:5000/api/vendors/${vendorId}/subaccount`
  );
  const data = await response.json();

  if (data.has_subaccount) {
    // Show green checkmark
    console.log('✅ Subaccount active:', data.subaccount.code);
  } else {
    // Show warning
    console.log('⚠️ No subaccount');
    // Show button to create subaccount
  }
};

// Manually create subaccount
const createSubaccount = async (vendorId) => {
  const response = await fetch(
    `http://localhost:5000/api/vendors/${vendorId}/subaccount`,
    { method: 'POST' }
  );
  const data = await response.json();

  if (data.success) {
    alert('Subaccount created successfully!');
  } else {
    alert(`Error: ${data.error}`);
  }
};
```

## Monitoring Checklist

Use this checklist when managing vendors:

- [ ] Vendor has Mobile Money number in profile
- [ ] Vendor is approved (verification_status = 'approved')
- [ ] Paystack subaccount code is present
- [ ] Subaccount is active in Paystack dashboard
- [ ] Percentage charge is set to 5%
- [ ] Test payment completes successfully
- [ ] Commission record is created after payment

## Support & Troubleshooting

If you encounter issues:

1. **Check Backend Logs:** Look for "Creating Paystack subaccount" messages
2. **Verify API Keys:** Ensure Paystack test/live keys are correct in `.env`
3. **Test Paystack API:** Use the check endpoint to see actual Paystack response
4. **Database State:** Query vendors table to see subaccount_code values
5. **Paystack Dashboard:** Verify subaccounts appear in Paystack

## Next Steps

After verifying subaccounts:
1. ✅ Test complete payment flow with split payments
2. ✅ Verify commissions are tracked correctly
3. ✅ Test payout creation for vendors
4. ✅ Monitor transactions in Paystack dashboard

---

**Last Updated:** December 3, 2025
