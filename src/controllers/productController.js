import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * Get all products (with filters)
 */
export const getAllProducts = async (req, res) => {
  try {
    const { category, vendor, search, limit, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        vendor:vendors(id, business_name, rating),
        category:categories(id, name, slug),
        images:product_images(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    if (offset) {
      query = query.range(parseInt(offset, 10), limit ? parseInt(offset, 10) + parseInt(limit, 10) - 1 : 99999);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Supabase error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Products fetched:', products?.length || 0);

    // Apply filters
    let filtered = products || [];

    if (category) {
      filtered = filtered.filter(p => p.category_id === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(searchLower));
    }

    res.json({ products: filtered, count: filtered.length });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
};

/**
 * Get single product by ID
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        vendor:vendors(id, business_name, business_description, rating, total_reviews),
        category:categories(id, name, slug),
        images:product_images(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Increment view count
    await supabaseAdmin
      .from('products')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id);

    res.json({ product: data });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

/**
 * Get vendor's products (requires auth)
 */
export const getVendorProducts = async (req, res) => {
  try {
    // Get vendor ID from authenticated user
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch related data separately
    const productsWithRelations = await Promise.all(
      (data || []).map(async (product) => {
        const { data: categoryData } = await supabaseAdmin
          .from('categories')
          .select('id, name, slug')
          .eq('id', product.category_id)
          .single();

        const { data: images } = await supabaseAdmin
          .from('product_images')
          .select('*')
          .eq('product_id', product.id);

        return {
          ...product,
          category: categoryData,
          images: images || []
        };
      })
    );

    res.json({ products: productsWithRelations });
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

/**
 * Get products by user ID (for vendor dashboard without auth middleware)
 */
export const getProductsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get vendor ID from user ID
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch related data separately
    const productsWithRelations = await Promise.all(
      (data || []).map(async (product) => {
        const { data: categoryData } = await supabaseAdmin
          .from('categories')
          .select('id, name, slug')
          .eq('id', product.category_id)
          .single();

        const { data: images } = await supabaseAdmin
          .from('product_images')
          .select('*')
          .eq('product_id', product.id);

        return {
          ...product,
          category: categoryData,
          images: images || []
        };
      })
    );

    res.json({ products: productsWithRelations });
  } catch (error) {
    console.error('Error fetching products by user ID:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

/**
 * Create new product
 */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      compare_at_price,
      stock_quantity,
      sku,
      category_id,
      is_featured,
    } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Get vendor ID
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id, is_verified, total_products')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    if (!vendor.is_verified) {
      return res.status(403).json({ error: 'Vendor account not verified' });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Create product
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          vendor_id: vendor.id,
          name,
          slug: `${slug}-${Date.now()}`,
          description,
          price,
          compare_at_price,
          stock_quantity: stock_quantity || 0,
          sku,
          category_id,
          is_featured: is_featured || false,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update vendor's total products count
    await supabaseAdmin
      .from('vendors')
      .update({ total_products: (vendor.total_products || 0) + 1 })
      .eq('id', vendor.id);

    res.status(201).json({ product: data });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

/**
 * Update product
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get vendor ID
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.vendor_id;
    delete updates.id;
    delete updates.views;
    delete updates.sales_count;
    delete updates.rating;
    delete updates.review_count;

    // Update product
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('vendor_id', vendor.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ product: data });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get vendor ID
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Delete product
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
      .eq('vendor_id', vendor.id);

    if (error) throw error;

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

/**
 * Toggle product active status
 */
export const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get vendor ID
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Get current status
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('is_active')
      .eq('id', id)
      .eq('vendor_id', vendor.id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Toggle status
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', id)
      .eq('vendor_id', vendor.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ product: data });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
};

/**
 * Get all categories
 */
export const getCategories = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug')
      .order('name');

    if (error) throw error;

    res.json({ categories: data });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};
