import { EmailOptions } from "../email";
import { AloituskuulutusKutsuAdapter } from "../../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { projektiPaallikkoJaVarahenkilotEmails } from "../emailTemplates";

const lahetekirje11 = (adapter: AloituskuulutusKutsuAdapter) => {
  const paragraphs = [
    adapter.text("asiakirja.ala_vastaa"),
    adapter.nimi,
    adapter.uudelleenKuulutusSeloste,
    adapter.text("asiakirja.aloituskuulutus_lahete_email.kappale1"),
    adapter.text("asiakirja.aloituskuulutus_lahete_email.kappale1"),
    adapter.text("asiakirja.aloituskuulutus_lahete_email.kappale1"),
    adapter.hankkeenKuvaus(),
    adapter.text("asiakirja.tietosuoja"),
    adapter.text("asiakirja.lisatietoja_antavat"),
    ...adapter.simple_yhteystiedot,
  ]
    .filter((p) => !!p)
    .map((p) => adapter.substituteText(p as string));
  return paragraphs.join("\n\n");
};

export function createLahetekirjeEmail(adapter: AloituskuulutusKutsuAdapter): EmailOptions {
  const subject = adapter.text("asiakirja.aloituskuulutus_lahete_email.otsikko");
  const text = lahetekirje11(adapter);
  return {
    subject,
    text,
    to: adapter.laheteKirjeVastaanottajat,
    cc: adapter.kayttoOikeudet && projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}
