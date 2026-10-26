import { OrderBoard } from "@/features/orders/OrderBoard";

export const metadata = { title: "Kitchen" };
export default function KitchenHome() {
  return <OrderBoard title="Kitchen orders" />;
}
