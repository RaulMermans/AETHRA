import { BRAND_ASSETS, BRAND_NAME } from "@/lib/brand";

/** Header lockup from the AETHRA raster kit (D58). */
export function BrandWordmark() {
  return (
    <span className="flex min-w-0 items-center">
      {/* Native img: lockup is a static public PNG, not a data-bound asset. */}
      <img
        src={BRAND_ASSETS.lockupOnDark}
        alt={BRAND_NAME}
        width={1616}
        height={382}
        className="h-7 w-auto max-w-[min(42vw,11.5rem)] object-contain object-left sm:h-8 sm:max-w-[13.5rem]"
        decoding="async"
      />
    </span>
  );
}
