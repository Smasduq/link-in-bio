export type Product = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  price: number;
  total_charge: number;
  cover_image_url: string | null;
  file_name: string;
  is_active: boolean;
  sales_count: number;
  revenue: number;
  created_at: string;
};

export type PublicProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  total_charge: number;
  cover_image_url: string | null;
  file_name: string;
};

export type ProductSale = {
  id: string;
  product_id: string;
  product_title: string;
  buyer_email: string;
  amount_paid: number;
  paystack_reference: string;
  download_count: number;
  download_flagged: boolean;
  created_at: string;
};

export type PurchaseInitializeResponse = {
  access_code: string;
  reference: string;
  authorization_url: string;
  public_key: string;
  product_id: string;
  buyer_email: string;
  pricing: {
    base_amount: number;
    total_charge: number;
    total_charge_kobo: number;
  };
};

export function formatNgn(amount: number): string {
  return amount % 1 === 0 ? `₦${amount.toLocaleString()}` : `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
