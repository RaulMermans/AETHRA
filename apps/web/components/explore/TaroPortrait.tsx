/** TARO profile picture from the character sheet. */
export function TaroPortrait({ className }: { className?: string }) {
  return (
    // Native img: static public PNG, same pattern as BrandWordmark.
    // eslint-disable-next-line @next/next/no-img-element -- not a data-bound asset
    <img
      src="/taro/taro-pfp.png"
      alt=""
      width={80}
      height={80}
      className={`block rounded-full object-cover ${className ?? "size-10"}`}
      aria-hidden
    />
  );
}
