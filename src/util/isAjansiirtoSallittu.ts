export function isAjansiirtoSallittu(): boolean {
  return process.env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU === "true";
}
