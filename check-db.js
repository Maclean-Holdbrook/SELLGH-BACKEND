import { supabase } from './src/config/supabase.js';

async function check() {
  console.log('--- Database Audit ---');
  try {
    const potentialTables = [
      'profiles', 'users', 'vendors', 'categories',
      'products', 'product_images', 'orders', 'order_items',
      'cart_items', 'wishlist', 'reviews', 'transactions', 'payouts'
    ];

    for (const table of potentialTables) {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ [${table}] exists. Rows: ${count}`);
      } else {
        console.log(`❌ [${table}] Error ${error.code}: ${error.message}`);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

check();
