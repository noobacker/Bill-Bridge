import { redirect } from "next/navigation";

export default function InventoryPage() {
  // Redirect to raw materials page by default
  redirect("/dashboard/inventory/raw-materials");
}
