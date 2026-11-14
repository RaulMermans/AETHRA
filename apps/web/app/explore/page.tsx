import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/ExploreView";
import { BRAND_NAME } from "@/lib/brand";
import { LocaleProvider } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: BRAND_NAME,
};

export default function ExplorePage() {
  return (
    <LocaleProvider>
      <ExploreView />
    </LocaleProvider>
  );
}
