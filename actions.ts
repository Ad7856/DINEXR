"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parsePercentToBps, parseRupees } from "@/lib/money";
import { ADMIN_ROLES, requireRole } from "@/server/auth/guards";

// Every action: re-checks the role server-side, scopes by the verified restaurant id, and relies on RLS as a second layer.
function done(path: string, k: "e" | "ok", m: string): never { redirect(`${path}?${k}=${encodeURIComponent(m)}`); }
async function ctx(path: string) { const staff = await requireRole(ADMIN_ROLES, path); return { staff, db: createClient() }; }
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = z.string().uuid();
const MENU = "/admin/menu", TABLES = "/admin/tables", SETTINGS = "/admin/settings";

// ---------- categories ----------
export async function createCategory(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const name = z.string().min(1).max(40).safeParse(s(f, "name"));
  if (!name.success) done(MENU, "e", "Enter a category name (max 40 characters).");
  const { data: last } = await db.from("categories").select("sort_order").eq("restaurant_id", staff.restaurantId).order("sort_order", { ascending: false }).limit(1);
  const { error } = await db.from("categories").insert({ restaurant_id: staff.restaurantId, name: name.data, sort_order: (last?.[0]?.sort_order ?? -1) + 1 });
  if (error) done(MENU, "e", error.code === "23505" ? "That category already exists." : "Could not save the category.");
  revalidatePath(MENU); done(MENU, "ok", "Category added.");
}
export async function renameCategory(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const id = uuid.safeParse(s(f, "id")), name = z.string().min(1).max(40).safeParse(s(f, "name"));
  if (!id.success || !name.success) done(MENU, "e", "Enter a valid category name.");
  const { error } = await db.from("categories").update({ name: name.data }).eq("id", id.data).eq("restaurant_id", staff.restaurantId);
  if (error) done(MENU, "e", error.code === "23505" ? "That category already exists." : "Could not rename the category.");
  revalidatePath(MENU); done(MENU, "ok", "Category renamed.");
}
export async function deleteCategory(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const id = uuid.safeParse(s(f, "id")); if (!id.success) done(MENU, "e", "Invalid category.");
  // Dishes keep existing: their category is set to null by the foreign key (on delete set null).
  const { error } = await db.from("categories").delete().eq("id", id.data).eq("restaurant_id", staff.restaurantId);
  if (error) done(MENU, "e", "Could not delete the category.");
  revalidatePath(MENU); done(MENU, "ok", "Category deleted. Its dishes are now uncategorized.");
}

// ---------- dishes ----------
const httpsUrl = z.string().url().max(500).refine((u) => u.startsWith("https://"), "URLs must start with https://");
const dishSchema = z.object({
  name: z.string().min(1).max(80), description: z.string().max(500).optional(),
  category_id: uuid.optional(), image_url: httpsUrl.optional(), model_glb_url: httpsUrl.optional(), model_usdz_url: httpsUrl.optional(),
  prep_minutes: z.coerce.number().int().min(1).max(240).optional(),
  model_width_mm: z.coerce.number().int().min(10).max(2000).optional(), model_depth_mm: z.coerce.number().int().min(10).max(2000).optional(),
});
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);

export async function saveDish(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const id = s(f, "id"); const back = id ? `${MENU}/${id}` : `${MENU}/new`;
  const v = (k: string) => s(f, k) || undefined;
  const p = dishSchema.safeParse({ name: s(f, "name"), description: v("description"), category_id: v("category_id"), image_url: v("image_url"),
    model_glb_url: v("model_glb_url"), model_usdz_url: v("model_usdz_url"), prep_minutes: v("prep_minutes"), model_width_mm: v("model_width_mm"), model_depth_mm: v("model_depth_mm") });
  if (!p.success) done(back, "e", p.error.issues[0]?.message ?? "Please check the form.");
  const price = parseRupees(s(f, "price")); if (price === null) done(back, "e", "Enter a price like 249 or 249.50.");
  const dp = s(f, "discounted_price") ? parseRupees(s(f, "discounted_price")) : undefined;
  if (dp === null || (dp !== undefined && dp > price)) done(back, "e", "Discounted price must be a valid amount no higher than the price.");
  if (p.data.category_id) {
    const { data: c } = await db.from("categories").select("id").eq("id", p.data.category_id).eq("restaurant_id", staff.restaurantId).maybeSingle();
    if (!c) done(back, "e", "Choose one of your own categories.");
  }
  const row = { ...p.data, price, discounted_price: dp ?? null, ingredients: list(s(f, "ingredients")), allergens: list(s(f, "allergens")),
    is_veg: s(f, "diet") === "veg", is_available: f.get("is_available") === "on", is_featured: f.get("is_featured") === "on",
    category_id: p.data.category_id ?? null, description: p.data.description ?? null, image_url: p.data.image_url ?? null, prep_minutes: p.data.prep_minutes ?? null,
    model_glb_url: p.data.model_glb_url ?? null, model_usdz_url: p.data.model_usdz_url ?? null, model_width_mm: p.data.model_width_mm ?? null, model_depth_mm: p.data.model_depth_mm ?? null };
  if (id) {
    if (!uuid.safeParse(id).success) done(MENU, "e", "Invalid dish.");
    const { error } = await db.from("dishes").update(row).eq("id", id).eq("restaurant_id", staff.restaurantId);
    if (error) done(back, "e", "Could not save the dish.");
    revalidatePath(MENU); done(back, "ok", "Dish saved.");
  }
  const { data, error } = await db.from("dishes").insert({ ...row, restaurant_id: staff.restaurantId }).select("id").single();
  if (error || !data) done(back, "e", "Could not create the dish.");
  revalidatePath(MENU); done(`${MENU}/${data.id}`, "ok", "Dish created. You can now add options.");
}
export async function setAvailability(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const id = uuid.safeParse(s(f, "id")); if (!id.success) done(MENU, "e", "Invalid dish.");
  const { error } = await db.from("dishes").update({ is_available: s(f, "available") === "1" }).eq("id", id.data).eq("restaurant_id", staff.restaurantId);
  if (error) done(MENU, "e", "Could not update availability.");
  revalidatePath(MENU); done(MENU, "ok", "Availability updated.");
}
export async function deleteDish(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const id = uuid.safeParse(s(f, "id")); if (!id.success) done(MENU, "e", "Invalid dish.");
  // Past orders keep their name/price snapshot; order_items.dish_id is set to null.
  const { error } = await db.from("dishes").delete().eq("id", id.data).eq("restaurant_id", staff.restaurantId);
  if (error) done(MENU, "e", "Could not delete the dish.");
  revalidatePath(MENU); done(MENU, "ok", "Dish deleted. Past orders are unaffected.");
}
export async function addOption(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const dishId = uuid.safeParse(s(f, "dish_id")); if (!dishId.success) done(MENU, "e", "Invalid dish.");
  const back = `${MENU}/${dishId.data}`;
  const g = z.string().min(1).max(40).safeParse(s(f, "group_name")), o = z.string().min(1).max(60).safeParse(s(f, "option_name"));
  const delta = s(f, "price_delta") ? parseRupees(s(f, "price_delta")) : 0;
  if (!g.success || !o.success || delta === null) done(back, "e", "Enter a group, an option name and a valid extra price.");
  const { data: d } = await db.from("dishes").select("id").eq("id", dishId.data).eq("restaurant_id", staff.restaurantId).maybeSingle();
  if (!d) done(MENU, "e", "Dish not found.");
  const { error } = await db.from("dish_customizations").insert({ dish_id: dishId.data, group_name: g.data, option_name: o.data, price_delta: delta });
  if (error) done(back, "e", "Could not add the option.");
  revalidatePath(back); done(back, "ok", "Option added.");
}
export async function deleteOption(f: FormData) {
  const { staff, db } = await ctx(MENU);
  const id = uuid.safeParse(s(f, "id")), dishId = uuid.safeParse(s(f, "dish_id")); if (!id.success || !dishId.success) done(MENU, "e", "Invalid option.");
  const back = `${MENU}/${dishId.data}`;
  const { data: d } = await db.from("dishes").select("id").eq("id", dishId.data).eq("restaurant_id", staff.restaurantId).maybeSingle();
  if (!d) done(MENU, "e", "Dish not found.");
  const { error } = await db.from("dish_customizations").delete().eq("id", id.data).eq("dish_id", dishId.data);
  if (error) done(back, "e", "Could not remove the option.");
  revalidatePath(back); done(back, "ok", "Option removed.");
}

// ---------- tables ----------
const tableSchema = z.object({ code: z.string().regex(/^[a-z0-9-]{2,30}$/, "Code: 2-30 lowercase letters, digits or hyphens."), label: z.string().min(1).max(30) });
export async function createTable(f: FormData) {
  const { staff, db } = await ctx(TABLES);
  const p = tableSchema.safeParse({ code: s(f, "code").toLowerCase(), label: s(f, "label") });
  if (!p.success) done(TABLES, "e", p.error.issues[0].message);
  const { error } = await db.from("restaurant_tables").insert({ ...p.data, restaurant_id: staff.restaurantId });
  if (error) done(TABLES, "e", error.code === "23505" ? "That table code already exists." : "Could not create the table.");
  revalidatePath(TABLES); done(TABLES, "ok", "Table added.");
}
export async function updateTable(f: FormData) {
  const { staff, db } = await ctx(TABLES);
  const id = uuid.safeParse(s(f, "id")); const p = tableSchema.safeParse({ code: s(f, "code").toLowerCase(), label: s(f, "label") });
  if (!id.success || !p.success) done(TABLES, "e", p.success ? "Invalid table." : p.error.issues[0].message);
  const { error } = await db.from("restaurant_tables").update({ ...p.data, is_active: f.get("is_active") === "on" }).eq("id", id.data).eq("restaurant_id", staff.restaurantId);
  if (error) done(TABLES, "e", error.code === "23505" ? "That table code already exists." : "Could not update the table.");
  revalidatePath(TABLES); done(TABLES, "ok", "Table saved. If you changed the code, reprint its QR.");
}

// ---------- settings (owner only) ----------
const OWNERS = ["owner", "platform_admin"];
export async function updateRestaurant(f: FormData) {
  const { staff, db } = await ctx(SETTINGS);
  if (!OWNERS.includes(staff.role)) done(SETTINGS, "e", "Only the owner can change restaurant settings.");
  const p = z.object({ name: z.string().min(1).max(80), description: z.string().max(400).optional(), phone: z.string().max(30).optional(), address: z.string().max(200).optional() })
    .safeParse({ name: s(f, "name"), description: s(f, "description") || undefined, phone: s(f, "phone") || undefined, address: s(f, "address") || undefined });
  if (!p.success) done(SETTINGS, "e", "Please check the restaurant details.");
  const { error } = await db.from("restaurants").update({ name: p.data.name, description: p.data.description ?? null, phone: p.data.phone ?? null,
    address: p.data.address ?? null, is_ordering_enabled: f.get("is_ordering_enabled") === "on" }).eq("id", staff.restaurantId);
  if (error) done(SETTINGS, "e", "Could not save settings.");
  revalidatePath(SETTINGS); done(SETTINGS, "ok", "Settings saved.");
}
export async function updateCharges(f: FormData) {
  const { staff, db } = await ctx(SETTINGS);
  if (!OWNERS.includes(staff.role)) done(SETTINGS, "e", "Only the owner can change taxes.");
  const tax = parsePercentToBps(s(f, "tax_percent")), svc = parsePercentToBps(s(f, "service_percent"));
  if (tax === null || svc === null) done(SETTINGS, "e", "Enter percentages between 0 and 100 (up to 2 decimals).");
  const { error } = await db.from("restaurant_settings").upsert({ restaurant_id: staff.restaurantId, tax_bps: tax, service_charge_bps: svc }, { onConflict: "restaurant_id" });
  if (error) done(SETTINGS, "e", "Could not save taxes.");
  revalidatePath(SETTINGS); done(SETTINGS, "ok", "Tax and charges saved. New orders use these rates.");
}
