import QRCode from "qrcode";

const SLUG = /^[a-z0-9-]{3,60}$/;
const CODE = /^[a-z0-9-]{2,30}$/;

/** The URL a table QR encodes. Contains only slugs, never prices or menu data, so menu edits never invalidate printed QRs. */
export function tableUrl(siteUrl: string, restaurantSlug: string, tableCode: string): string {
  if (!SLUG.test(restaurantSlug) || !CODE.test(tableCode)) throw new Error("Invalid restaurant or table code");
  return `${siteUrl.replace(/\/+$/, "")}/r/${restaurantSlug}/t/${tableCode}`;
}
const opts = { errorCorrectionLevel: "M" as const, margin: 2 };
export const qrPngBuffer = (url: string) => QRCode.toBuffer(url, { ...opts, type: "png", width: 800 });
export const qrDataUrl = (url: string) => QRCode.toDataURL(url, { ...opts, width: 700 });
