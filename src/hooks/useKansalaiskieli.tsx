import { Kieli } from "@services/api";
import { useRouter } from "next/router";

export function useKansalaiskieli(): Kieli.SUOMI | Kieli.RUOTSI {
  const { locale } = useRouter();
  return locale === "sv" ? Kieli.RUOTSI : Kieli.SUOMI;
}

export default useKansalaiskieli;
