import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware to verify JWT token from Supabase
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Invalid or expired token:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('✅ User authenticated:', user.id);
    console.log('🔍 Querying user profile from database...');

    // Get user profile - try both 'users' and 'profiles' tables
    let profile = null;
    let profileError = null;

    // Try users table first (use admin client to bypass RLS)
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    console.log('📊 Users table query result:', { data: usersData, error: usersError });

    if (usersData) {
      profile = usersData;
      console.log('✅ Profile found in users table:', profile);
    } else {
      console.log('⚠️ Users table query failed, trying profiles table:', usersError);

      // Try profiles table
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profilesData) {
        profile = profilesData;
      } else {
        console.error('❌ Profile not found in either users or profiles table');
        console.error('Users error:', usersError);
        console.error('Profiles error:', profilesError);

        // If no profile exists, use basic user data with default role
        profile = {
          id: user.id,
          email: user.email,
          role: 'customer',
          ...user.user_metadata
        };
        console.log('⚠️ Using fallback profile:', profile);
      }
    }

    // Attach user and profile to request
    req.user = user;
    req.profile = profile;

    console.log('✅ Profile loaded:', { id: profile.id, role: profile.role });
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
