import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Create or update the authenticated user's profile in a trusted context
router.post('/sync-profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestedRole = req.body?.role;
    const safeRole = ['customer', 'vendor'].includes(requestedRole) ? requestedRole : 'customer';

    const payload = {
      id: userId,
      email: req.user.email,
      full_name: req.body?.full_name || req.user.user_metadata?.full_name || req.user.user_metadata?.name || '',
      phone: req.body?.phone || req.user.user_metadata?.phone || '',
      role: safeRole,
      updated_at: new Date().toISOString(),
    };

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (existingUser?.role === 'admin') {
      payload.role = 'admin';
    }

    const { data: syncedUser, error } = await supabaseAdmin
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error syncing user profile:', error);
      return res.status(500).json({ error: 'Failed to sync user profile' });
    }

    res.json({
      success: true,
      user: syncedUser,
    });
  } catch (error) {
    console.error('Error in sync-profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upgrade customer account to vendor
router.post('/upgrade-to-vendor', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔄 Upgrading user to vendor:', userId);

    // Check current user role
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('role, email, full_name')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a vendor or admin
    if (currentUser.role === 'vendor') {
      return res.status(400).json({ error: 'User is already a vendor' });
    }

    if (currentUser.role === 'admin') {
      return res.status(400).json({ error: 'Admin cannot be converted to vendor' });
    }

    // Update user role to vendor
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: 'vendor',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    console.log('✅ User upgraded to vendor successfully');

    res.json({
      success: true,
      message: 'Account upgraded to vendor successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('❌ Error in upgrade-to-vendor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone, role, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Error in get profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
