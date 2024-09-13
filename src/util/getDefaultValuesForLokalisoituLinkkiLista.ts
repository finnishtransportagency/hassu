import { Kieli, LokalisoituLinkkiInput } from "@services/api";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

export function getDefaultValuesForLokalisoituLinkkiLista(
  kielitiedot: ProjektiLisatiedolla["kielitiedot"],
  linkkilista: LokalisoituLinkkiInput[] | null | undefined
): LokalisoituLinkkiInput[] {
  if (!linkkilista) {
    return [];
  }
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot || {};
  const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;

  return linkkilista.map<LokalisoituLinkkiInput>((linkki: LokalisoituLinkkiInput) => {
    const defaultValue: LokalisoituLinkkiInput = { SUOMI: { nimi: linkki.SUOMI.nimi ?? "", url: linkki.SUOMI.url ?? "" } };
    if (hasRuotsinKieli) {
      defaultValue.RUOTSI = { nimi: linkki.RUOTSI?.nimi ?? "", url: linkki.RUOTSI?.url ?? "" };
    }
    return defaultValue;
  });
}
