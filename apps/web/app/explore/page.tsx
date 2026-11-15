import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/ExploreView";
import { BRAND_NAME } from "@/lib/brand";
import { LocaleProvider } from "@/lib/i18n/locale";
import { AccessibilityProvider } from "@/lib/a11y/accessibility";

export const metadata: Metadata = {
  title: BRAND_NAME,
};

export default function ExplorePage() {
  return (
    <LocaleProvider>
      <AccessibilityProvider>
        <ExploreView />
      </AccessibilityProvider>
    </LocaleProvider>
  );
}
