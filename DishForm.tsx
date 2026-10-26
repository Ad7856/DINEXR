import { saveDish } from "@/app/admin/actions";

type Dish = { id: string; name: string; description: string | null; category_id: string | null; price: number; discounted_price: number | null;
  image_url: string | null; ingredients: string[]; allergens: string[]; is_veg: boolean; is_available: boolean; is_featured: boolean; prep_minutes: number | null;
  model_glb_url: string | null; model_usdz_url: string | null; model_width_mm: number | null; model_depth_mm: number | null };
const rs = (n: number | null | undefined) => (n == null ? "" : (n / 100).toFixed(2));

export function DishForm({ dish, categories }: { dish?: Dish; categories: { id: string; name: string }[] }) {
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block space-y-1"><span className="text-sm text-chalk-dim">{t}</span>{children}</label>;
  return (
    <form action={saveDish} className="card space-y-4 p-5">
      {dish && <input type="hidden" name="id" value={dish.id} />}
      <L t="Name"><input className="input" name="name" required maxLength={80} defaultValue={dish?.name} /></L>
      <L t="Description"><textarea className="input" name="description" rows={2} maxLength={500} defaultValue={dish?.description ?? ""} /></L>
      <div className="grid grid-cols-2 gap-3">
        <L t="Price (₹)"><input className="input" name="price" required inputMode="decimal" defaultValue={rs(dish?.price)} /></L>
        <L t="Discounted price (₹, optional)"><input className="input" name="discounted_price" inputMode="decimal" defaultValue={rs(dish?.discounted_price)} /></L>
      </div>
      <L t="Category"><select className="input" name="category_id" defaultValue={dish?.category_id ?? ""}><option value="">Uncategorized</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
      <fieldset className="flex gap-6"><legend className="mb-1 text-sm text-chalk-dim">Diet</legend>
        <label className="flex items-center gap-2"><input type="radio" name="diet" value="veg" defaultChecked={dish ? dish.is_veg : true} className="accent-bloom" /> Vegetarian</label>
        <label className="flex items-center gap-2"><input type="radio" name="diet" value="nonveg" defaultChecked={dish ? !dish.is_veg : false} className="accent-bloom" /> Non-vegetarian</label></fieldset>
      <div className="flex gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_available" defaultChecked={dish ? dish.is_available : true} className="accent-bloom" /> Available</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={dish?.is_featured} className="accent-bloom" /> Featured</label></div>
      <L t="Ingredients (comma separated)"><input className="input" name="ingredients" defaultValue={dish?.ingredients.join(", ")} /></L>
      <L t="Allergens (comma separated)"><input className="input" name="allergens" defaultValue={dish?.allergens.join(", ")} /></L>
      <L t="Preparation time (minutes)"><input className="input" name="prep_minutes" inputMode="numeric" defaultValue={dish?.prep_minutes ?? ""} /></L>
      <L t="Photo URL (https)"><input className="input" name="image_url" type="url" defaultValue={dish?.image_url ?? ""} /></L>
      <fieldset className="space-y-3 rounded-xl border border-board-line p-3"><legend className="px-1 text-sm text-chalk-dim">3D model (optional, only add real models)</legend>
        <L t="GLB/glTF URL (https)"><input className="input" name="model_glb_url" type="url" defaultValue={dish?.model_glb_url ?? ""} /></L>
        <L t="USDZ URL for iOS Quick Look (https, optional)"><input className="input" name="model_usdz_url" type="url" defaultValue={dish?.model_usdz_url ?? ""} /></L>
        <div className="grid grid-cols-2 gap-3">
          <L t="Real width (mm)"><input className="input" name="model_width_mm" inputMode="numeric" defaultValue={dish?.model_width_mm ?? ""} /></L>
          <L t="Real depth (mm)"><input className="input" name="model_depth_mm" inputMode="numeric" defaultValue={dish?.model_depth_mm ?? ""} /></L></div>
        <p className="text-xs text-chalk-dim">Only enter dimensions you have measured. Without them, customers are told the model size isn’t calibrated.</p></fieldset>
      <button className="btn w-full">{dish ? "Save dish" : "Create dish"}</button>
    </form>
  );
}
