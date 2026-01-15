# Google OAuth Setup Instructions

## Overview
This guide will help you configure Google OAuth for your SellGH application using Supabase.

## Prerequisites
- Supabase project set up
- Google Cloud Console access

## Step 1: Configure Google Cloud Console

### 1.1 Create a Project (or use existing)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "SellGH" (or your preferred name)
4. Click "Create"

### 1.2 Enable Google+ API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 1.3 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: SellGH
   - User support email: your email
   - Developer contact: your email
   - Scopes: Select email, profile, openid
   - Add test users if needed
   - Click "Save and Continue"

4. Create OAuth Client ID:
   - Application type: "Web application"
   - Name: "SellGH Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `https://your-production-domain.com` (production)
   - Authorized redirect URIs:
     - Get this from Supabase (next step)
   - Click "Create"

5. **Save your credentials:**
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxx`

## Step 2: Configure Supabase

### 2.1 Get Supabase Callback URL
1. Go to your Supabase project dashboard
2. Navigate to "Authentication" → "Providers"
3. Scroll to "Google"
4. Copy the "Callback URL (for OAuth)" - it looks like:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

### 2.2 Add Callback URL to Google
1. Go back to Google Cloud Console
2. Go to "APIs & Services" → "Credentials"
3. Click on your OAuth client ID
4. Under "Authorized redirect URIs", click "Add URI"
5. Paste the Supabase callback URL
6. Click "Save"

### 2.3 Enable Google Provider in Supabase
1. In Supabase dashboard, go to "Authentication" → "Providers"
2. Find "Google" and toggle it ON
3. Enter your Google credentials:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
4. Click "Save"

## Step 3: Configure Site URL and Redirect URLs

### 3.1 Set Site URL
1. In Supabase, go to "Authentication" → "URL Configuration"
2. Set "Site URL" to:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`

### 3.2 Set Redirect URLs
1. In "Redirect URLs" section, add:
   - `http://localhost:5173/shop` (development)
   - `https://your-domain.com/shop` (production)
2. Click "Save"

## Step 4: Test the Integration

### 4.1 Start Your Application
```bash
# Frontend
cd sell-gh
npm run dev

# Backend
cd sell-gh-backend
npm run dev
```

### 4.2 Test Login
1. Go to `http://localhost:5173/login`
2. Click "Sign in with Google"
3. You should be redirected to Google's login page
4. Select your Google account
5. Grant permissions
6. You should be redirected back to your app at `/shop`

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Solution**: Make sure the redirect URI in Google Cloud Console exactly matches the Supabase callback URL

### Error: "Invalid OAuth Client"
- **Solution**: Double-check that you've entered the correct Client ID and Client Secret in Supabase

### User is logged in but profile is not created
- **Solution**: The app should automatically create a user profile on first Google login. Check your Supabase `users` table to verify the trigger is working.

### Redirect not working
- **Solution**: Verify the Site URL and Redirect URLs in Supabase Authentication settings match your application URLs

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console:**
   - Add production domain to "Authorized JavaScript origins"
   - Add production callback URL to "Authorized redirect URIs"

2. **Update Supabase:**
   - Change "Site URL" to production domain
   - Add production redirect URLs

3. **Environment Variables:**
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly

## Security Notes

- Never commit your `.env` files to version control
- Keep your Client Secret secure
- Use HTTPS in production
- Regularly rotate your credentials
- Review OAuth consent screen settings

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → "Logs" → "Auth"
2. Check browser console for errors (F12)
3. Verify all URLs match exactly (including http/https)
4. Ensure Google+ API is enabled in Google Cloud

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Provider Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
