export type MemberRole = "platform_admin" | "owner" | "manager" | "kitchen";

export type Restaurant = {
  id: string; slug: string; name: string; description: string | null; logo_url: string | null;
  phone: string | null; address: string | null; currency: string;
  is_ordering_enabled: boolean; takeaway_enabled: boolean;
};
export type RestaurantTable = { id: string; code: string; label: string; is_active: boolean };
export type Category = { id: string; name: string; sort_order: number };
export type DishRow = {
  id: string; category_id: string | null; name: string; description: string | null;
  price: number; discounted_price: number | null; image_url: string | null;
  is_veg: boolean; is_available: boolean; is_featured: boolean; model_glb_url: string | null;
};
