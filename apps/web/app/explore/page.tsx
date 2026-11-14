import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/ExploreView";
import { BRAND_MISSION_LONG, BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} · ${BRAND_MISSION_LONG}`,
};

export default function ExplorePage() {
  return <ExploreView />;
}
