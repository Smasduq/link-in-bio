import { redirect } from "next/navigation";

export default function ProductsPage() {
  redirect("/dashboard/content?tab=products");
}
