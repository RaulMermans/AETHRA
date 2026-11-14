import { TaroPortrait } from "./TaroPortrait";

/** TARO profile picture in the companion header. */
export function AethraCoreFace() {
  return (
    <div
      data-aethra-face="taro"
      className="size-10 shrink-0 overflow-hidden rounded-full border border-line bg-black/35"
      aria-hidden
    >
      <TaroPortrait className="h-full w-full" />
    </div>
  );
}
