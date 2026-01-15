import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const paystackApi = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Initialize a payment transaction
 * @param {Object} data - Payment data
 * @param {string} data.email - Customer email
 * @param {number} data.amount - Amount in pesewas (GHS * 100)
 * @param {string} data.reference - Unique transaction reference
 * @param {string} data.callback_url - URL to redirect after payment
 * @param {Object} data.metadata - Additional data
 */
export const initializeTransaction = async (data) => {
  try {
    const response = await paystackApi.post('/transaction/initialize', {
      email: data.email,
      amount: data.amount, // Amount in pesewas
      reference: data.reference,
      callback_url: data.callback_url,
      metadata: data.metadata || {},
      channels: ['card', 'mobile_money'] // Enable both card and mobile money
    });

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack initialize error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Payment initialization failed'
    };
  }
};

/**
 * Verify a transaction
 * @param {string} reference - Transaction reference
 */
export const verifyTransaction = async (reference) => {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Payment verification failed'
    };
  }
};

/**
 * Charge a mobile money account
 * @param {Object} data - Charge data
 */
export const chargeMobileMoney = async (data) => {
  try {
    const response = await paystackApi.post('/charge', {
      email: data.email,
      amount: data.amount,
      mobile_money: {
        phone: data.phone,
        provider: data.provider // 'mtn', 'vod', 'tgo'
      },
      reference: data.reference,
      metadata: data.metadata || {}
    });

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack mobile money error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Mobile money charge failed'
    };
  }
};

/**
 * List all banks (for transfers)
 */
export const listBanks = async () => {
  try {
    const response = await paystackApi.get('/bank?country=ghana');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack list banks error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to list banks'
    };
  }
};

/**
 * Get bank code for mobile money provider
 * Paystack requires specific bank codes for Ghana mobile money
 */
const getMomoProviderCode = (provider) => {
  const codes = {
    'MTN': 'MTN',
    'mtn': 'MTN',
    'VOD': 'VOD',
    'vodafone': 'VOD',
    'TGO': 'TGO',
    'airteltigo': 'TGO',
    'airtel': 'TGO'
  };
  return codes[provider] || 'MTN'; // Default to MTN
};

/**
 * Create a subaccount for vendor split payments
 * @param {Object} data - Subaccount data
 * @param {string} data.business_name - Vendor business name
 * @param {string} data.settlement_bank - Bank code for mobile money (MTN, VOD, TGO)
 * @param {string} data.account_number - Mobile money number
 * @param {number} data.percentage_charge - Platform commission (5 = 5%)
 * @param {string} data.primary_contact_email - Vendor email
 * @param {string} data.primary_contact_name - Vendor contact name
 * @param {string} data.primary_contact_phone - Vendor phone
 */
export const createSubaccount = async (data) => {
  try {
    // Get proper bank code for mobile money
    const settlementBank = getMomoProviderCode(data.settlement_bank);

    console.log('Creating subaccount with:', {
      business_name: data.business_name,
      settlement_bank: settlementBank,
      account_number: data.account_number?.substring(0, 3) + 'XXXXX', // Hide full number in logs
      percentage_charge: data.percentage_charge || 5
    });

    const payload = {
      business_name: data.business_name,
      settlement_bank: settlementBank,
      account_number: data.account_number,
      percentage_charge: data.percentage_charge || 5,
      description: data.description || `Subaccount for ${data.business_name}`,
      primary_contact_email: data.primary_contact_email,
      primary_contact_name: data.primary_contact_name,
      primary_contact_phone: data.primary_contact_phone,
      metadata: data.metadata || {}
    };

    const response = await paystackApi.post('/subaccount', payload);

    console.log('✅ Subaccount created successfully:', response.data.data.subaccount_code);

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Paystack create subaccount error:', error.response?.data || error.message);

    // Return detailed error for debugging
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to create subaccount',
      details: error.response?.data
    };
  }
};

/**
 * Update an existing subaccount
 * @param {string} subaccount_code - Subaccount code
 * @param {Object} data - Data to update
 */
export const updateSubaccount = async (subaccount_code, data) => {
  try {
    const response = await paystackApi.put(`/subaccount/${subaccount_code}`, data);

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack update subaccount error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to update subaccount'
    };
  }
};

/**
 * Get subaccount details
 * @param {string} subaccount_code - Subaccount code
 */
export const getSubaccount = async (subaccount_code) => {
  try {
    const response = await paystackApi.get(`/subaccount/${subaccount_code}`);

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack get subaccount error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to get subaccount'
    };
  }
};

export default {
  initializeTransaction,
  verifyTransaction,
  chargeMobileMoney,
  listBanks,
  createSubaccount,
  updateSubaccount,
  getSubaccount
};
