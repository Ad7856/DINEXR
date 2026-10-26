// Static checks over migrations and env docs. They read files from the project root (run `vitest` from there).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const sql = readdirSync(join(root, "supabase/migrations")).sort().map((f) => readFileSync(join(root, "supabase/migrations", f), "utf8")).join("\n");

describe("migrations", () => {
  it("enables RLS on every table created", () => {
    const tables = [...sql.matchAll(/create table (\w+)/g)].map((m) => m[1]);
    const rlsList = sql.match(/foreach t in array array\[([^\]]+)\]/)![1];
    expect(tables.length).toBeGreaterThan(8);
    for (const t of tables) expect(rlsList).toContain(`'${t}'`);
  });
  it("locks order RPCs to service_role", () => {
    for (const fn of ["create_order(jsonb)", "update_order_status(uuid, uuid, order_status, order_status, uuid, text)"]) {
      expect(sql).toContain(`revoke all on function ${fn} from public, anon, authenticated`);
      expect(sql).toContain(`grant execute on function ${fn} to service_role`);
    }
  });
  it("removes direct staff UPDATE on orders and has no public order policies", () => {
    expect(sql).toContain("drop policy if exists ord_staff_upd on orders");
    expect(/create policy \w+ on (orders|order_items|order_status_history)[^;]*using \(true\)/.test(sql)).toBe(false);
  });
});

describe("environment variables", () => {
  const keys = [...readFileSync(join(root, "src/lib/env.ts"), "utf8").matchAll(/^\s+([A-Z][A-Z_]+): z\./gm)].map((m) => m[1]);
  const example = readFileSync(join(root, ".env.example"), "utf8");
  const readme = readFileSync(join(root, "README.md"), "utf8");
  it("every required variable is in .env.example and README", () => {
    expect(keys.length).toBe(5);
    for (const k of keys) { expect(example).toContain(`${k}=`); expect(readme).toContain(k); }
  });
  it("service-role and token secrets are not NEXT_PUBLIC_", () => {
    expect(example).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE");
    expect(example).not.toContain("NEXT_PUBLIC_ORDER_TOKEN");
  });
});
