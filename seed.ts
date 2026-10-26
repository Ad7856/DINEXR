/**
 * Demo seed: SAMPLE DATA for "The Royal Kitchen" (fictional). Creates NO users and NO credentials.
 * Run: npm run seed -- --yes     (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local)
 * Idempotent: re-running updates the restaurant/settings/tables and skips dishes that already exist by name.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
if (!process.argv.includes("--yes")) { console.error(`This writes demo data to ${url}. Re-run with --yes to confirm.`); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const fail = (what: string, e: { message: string } | null) => { if (e) { console.error(`${what}: ${e.message}`); process.exit(1); } };

const SLUG = "demo-restaurant";
type D = { name: string; cat: string; price: number; veg: boolean; desc: string; ing: string[]; allergens: string[]; prep: number; featured?: boolean; opts?: [string, string, number][] };
const dishes: D[] = [
  { name: "Paneer Tikka", cat: "Starters", price: 24900, veg: true, desc: "Charcoal-grilled cottage cheese marinated in spiced yogurt.", ing: ["paneer", "yogurt", "capsicum", "spices"], allergens: ["milk"], prep: 15, featured: true, opts: [["Extras", "Extra mint chutney", 1500]] },
  { name: "Chicken Biryani", cat: "Biryani", price: 29900, veg: false, desc: "Fragrant basmati layered with spiced chicken.", ing: ["basmati rice", "chicken", "saffron", "spices"], allergens: [], prep: 25, featured: true, opts: [["Extras", "Extra raita", 3000], ["Extras", "Extra chicken piece", 6000]] },
  { name: "Veg Fried Rice", cat: "Chinese", price: 17900, veg: true, desc: "Wok-tossed rice with seasonal vegetables.", ing: ["rice", "carrot", "beans", "spring onion", "soy sauce"], allergens: ["soy"], prep: 12 },
  { name: "Masala Dosa", cat: "South Indian", price: 12000, veg: true, desc: "Crisp rice crepe filled with spiced potato.", ing: ["rice", "urad dal", "potato", "spices"], allergens: [], prep: 12 },
  { name: "Chicken Curry", cat: "Main Course", price: 27900, veg: false, desc: "Home-style chicken curry in a rich onion-tomato gravy.", ing: ["chicken", "onion", "tomato", "spices"], allergens: [], prep: 20 },
  { name: "Gulab Jamun", cat: "Desserts", price: 8900, veg: true, desc: "Soft milk dumplings in cardamom syrup (2 pieces).", ing: ["khoya", "sugar", "cardamom"], allergens: ["milk", "gluten"], prep: 5 },
  { name: "Cold Coffee", cat: "Beverages", price: 11900, veg: true, desc: "Chilled blended coffee with milk.", ing: ["coffee", "milk", "sugar"], allergens: ["milk"], prep: 5, opts: [["Extras", "Add ice cream scoop", 4000]] },
];

async function main() {
  const { data: r, error: e1 } = await db.from("restaurants").upsert({
    slug: SLUG, name: "The Royal Kitchen", description: "SAMPLE DATA: a fictional demo restaurant for DINEXR.",
    phone: "+91 00000 00000", address: "Bhawanipatna, Odisha, India", currency: "INR", is_ordering_enabled: true,
  }, { onConflict: "slug" }).select("id").single();
  fail("restaurant", e1); const rid = r!.id;

  fail("settings", (await db.from("restaurant_settings").upsert({ restaurant_id: rid, tax_bps: 500, service_charge_bps: 0 }, { onConflict: "restaurant_id" })).error);

  const cats = [...new Set(dishes.map((d) => d.cat))];
  const { data: cr, error: e2 } = await db.from("categories").upsert(cats.map((name, i) => ({ restaurant_id: rid, name, sort_order: i })), { onConflict: "restaurant_id,name" }).select("id,name");
  fail("categories", e2); const catId = new Map(cr!.map((c) => [c.name, c.id]));

  let added = 0;
  for (const d of dishes) {
    const { data: ex } = await db.from("dishes").select("id").eq("restaurant_id", rid).eq("name", d.name).maybeSingle();
    if (ex) continue;
    const { data: row, error } = await db.from("dishes").insert({ restaurant_id: rid, category_id: catId.get(d.cat), name: d.name, description: d.desc,
      price: d.price, ingredients: d.ing, allergens: d.allergens, is_veg: d.veg, is_featured: !!d.featured, prep_minutes: d.prep }).select("id").single();
    fail(`dish ${d.name}`, error);
    if (d.opts) fail("options", (await db.from("dish_customizations").insert(d.opts.map(([g, o, p]) => ({ dish_id: row!.id, group_name: g, option_name: o, price_delta: p })))).error);
    added++;
  }
  fail("tables", (await db.from("restaurant_tables").upsert([1, 2, 3, 4, 5].map((n) => ({ restaurant_id: rid, code: `table-0${n}`, label: `Table ${n}`, is_active: true })), { onConflict: "restaurant_id,code" })).error);
  console.log(`Seeded "The Royal Kitchen" (slug ${SLUG}): ${added} new dishes, 5 tables. Sample data only. No users created.`);
  console.log(`Customer URL: /r/${SLUG}/t/table-01. Link a staff user with the SQL in README.`);
}
main();
