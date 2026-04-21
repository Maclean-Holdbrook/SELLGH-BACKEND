export const getLineItemTotal = (item) => {
  const value = item?.total ?? item?.subtotal ?? 0;
  return Number(value) || 0;
};

export const getLegacyVendorPayload = (input = {}) => {
  const businessDescription = input.business_description ?? input.description ?? '';
  const businessPhone = input.business_phone ?? input.phone ?? '';
  const businessEmail = input.business_email ?? input.email ?? '';
  const businessAddress = input.business_address ?? input.address ?? '';

  const mobileMoneyProvider =
    input.mobile_money_provider ||
    input.momo_provider ||
    (input.mtn_momo_number ? 'MTN' : input.vodafone_cash_number ? 'VODAFONE' : input.airteltigo_number ? 'AIRTELTIGO' : '');

  const mobileMoneyNumber =
    input.mobile_money_number ||
    input.momo_number ||
    input.mtn_momo_number ||
    input.vodafone_cash_number ||
    input.airteltigo_number ||
    '';

  return {
    business_name: input.business_name,
    slug: input.slug,
    description: businessDescription,
    business_description: businessDescription,
    logo_url: input.logo_url,
    banner_url: input.banner_url,
    phone: businessPhone,
    business_phone: businessPhone,
    email: businessEmail,
    business_email: businessEmail,
    address: businessAddress,
    business_address: businessAddress,
    city: input.city,
    region: input.region,
    momo_provider: mobileMoneyProvider || null,
    mobile_money_provider: mobileMoneyProvider || null,
    momo_number: mobileMoneyNumber || null,
    mobile_money_number: mobileMoneyNumber || null,
    mtn_momo_number: input.mtn_momo_number || null,
    vodafone_cash_number: input.vodafone_cash_number || null,
    airteltigo_number: input.airteltigo_number || null,
    momo_name: input.momo_name || null,
    business_registration_number: input.business_registration_number || null,
    tax_id: input.tax_id || null,
  };
};

export const getVendorSubaccountContact = (vendor = {}) => {
  const provider = vendor.momo_provider || vendor.mobile_money_provider || 'MTN';
  const accountNumber =
    vendor.momo_number ||
    vendor.mobile_money_number ||
    vendor.mtn_momo_number ||
    vendor.vodafone_cash_number ||
    vendor.airteltigo_number ||
    null;

  return {
    provider,
    accountNumber,
    contactEmail: vendor.business_email || vendor.email || null,
    contactPhone: vendor.business_phone || vendor.phone || null,
  };
};

export const getPayoutCommissionIds = (payout = {}) => payout.commission_ids || payout.order_ids || [];
