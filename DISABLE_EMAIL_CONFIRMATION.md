# Disable Email Confirmation in Supabase

## The Problem

Users are being created in Supabase Auth, but profiles are NOT being created in the users table.

This is because **Email Confirmation is enabled** in your Supabase project. When a user signs up:
1. Auth user is created
2. BUT the user is NOT fully authenticated until they click the confirmation email
3. The profile creation code runs, but WITHOUT authentication, so the INSERT fails due to RLS policies

## The Solution

**Disable email confirmation** for development/testing:

### Step 1: Go to Supabase Dashboard

1. Open your Supabase project dashboard
2. Click **Authentication** in the left sidebar
3. Click **Providers**
4. Find **Email** provider

### Step 2: Disable Email Confirmation

1. Click on **Email** provider
2. Scroll down to **"Confirm email"**
3. **TOGGLE IT OFF** (disable)
4. Click **Save**

### Step 3: Test Signup

1. Go back to your app at http://localhost:5173/signup
2. Try signing up with a NEW email
3. Check the console - you should now see:
   - ✅ Auth user created
   - 📋 Creating user profile in users table...
   - ✅ Profile created successfully!
4. You should be redirected to the vendor dashboard immediately

---

## Alternative: Enable Auto-Confirm

If you want to keep email confirmation for production but disable it for testing:

1. Go to **Authentication** → **Settings** → **Auth Providers**
2. Look for "Enable email confirmations"
3. Uncheck it
4. Save

---

## After Disabling

Once you disable email confirmation, existing users who haven't confirmed their email will need to:
- Be manually confirmed in Supabase Dashboard → Authentication → Users → Click on user → Confirm user
- OR sign up again with a new email

---

## For Production

You can re-enable email confirmation later when you're ready to deploy. For now, disable it to get signup working.
