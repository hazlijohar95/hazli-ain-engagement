import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Calendar03Icon,
  Diamond02Icon,
  FavouriteIcon,
  MailLove01Icon,
  MinusSignIcon,
  MusicNote01Icon,
  PlusSignIcon,
  QuillWrite02Icon,
  Tick02Icon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/** Interface icons come from Hugeicons (MIT); one stroke weight everywhere. */
function icon(svg: IconSvgElement, defaultSize = 22) {
  return function Icon({ size = defaultSize }: { size?: number }) {
    return <HugeiconsIcon icon={svg} size={size} color="currentColor" strokeWidth={1.5} aria-hidden="true" />;
  };
}

export const IconInvite = icon(Diamond02Icon);
export const IconCalendar = icon(Calendar03Icon);
export const IconLetter = icon(MailLove01Icon);
export const IconHeart = icon(FavouriteIcon);
export const IconCheck = icon(Tick02Icon);
export const IconMinus = icon(MinusSignIcon);
export const IconPlus = icon(PlusSignIcon);
export const IconArrow = icon(ArrowUpRight01Icon, 18);
export const IconChevron = icon(ArrowDown01Icon);
export const IconMusic = icon(MusicNote01Icon, 20);
export const IconMusicOff = icon(VolumeOffIcon, 20);
export const IconQuill = icon(QuillWrite02Icon, 20);

/** Official app logos (Iconify "logos" set, CC0; Outlook from Material Design Icons, Apache 2.0), served from /brand. */
export type Brand = "google-maps" | "google-calendar" | "apple" | "outlook";

export function BrandLogo({ brand, size = 26 }: { brand: Brand; size?: number }) {
  return <img className={`brand brand-${brand}`} src={`/brand/${brand}.svg`} width={size} height={size} alt="" aria-hidden="true" />;
}
