import { supabaseAdmin } from './src/config/supabase.js';

async function createAdminUser() {
  try {
    console.log('Creating admin user profile...');

    const userId = '05d79081-e0b1-4e9b-a61b-b161872c530c';
    const email = 'macleaann723@gmail.com';

    // First, let's check what columns exist
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Existing user check:', { data: existingUser, error: checkError });

    // Insert or update the user with admin role (without is_active for now)
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        full_name: 'Admin User',
        role: 'admin'
      }, {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error('❌ Error creating admin user:', error);
      process.exit(1);
    }

    console.log('✅ Admin user profile created successfully!');
    console.log('User data:', data);

    // Verify the user
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying user:', verifyError);
    } else {
      console.log('✅ Verified user profile:', verifyData);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createAdminUser();
