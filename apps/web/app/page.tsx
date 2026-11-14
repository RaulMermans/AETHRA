import { redirect } from "next/navigation";

// The app opens straight onto the globe; there is no landing page.
export default function Home() {
  redirect("/explore");
}
