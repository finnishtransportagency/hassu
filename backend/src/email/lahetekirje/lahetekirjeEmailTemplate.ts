import { EmailOptions } from "../email";
import { AloituskuulutusKutsuAdapter } from "../../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { projektiPaallikkoJaVarahenkilotEmails } from "../emailTemplates";
import { Kieli } from "../../../../common/graphql/apiModel";

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
  const ruotsiProps = adapter.props;
  ruotsiProps.kieli = Kieli.RUOTSI;
  const ruotsiAdapter = new AloituskuulutusKutsuAdapter(ruotsiProps);

  let text2 = "";
  let text = lahetekirje11(adapter);
  if (adapter.kielitiedot.ensisijainenKieli === Kieli.RUOTSI) {
    text2 = text;
    text = lahetekirje11(ruotsiAdapter);
  } else if (adapter.kielitiedot.toissijainenKieli === Kieli.RUOTSI) {
    text2 = lahetekirje11(ruotsiAdapter);
  }
  text += "\n\n" + text2;

  const subject = adapter.text("asiakirja.aloituskuulutus_lahete_email.otsikko");
  return {
    subject,
    text,
    to: adapter.laheteKirjeVastaanottajat,
    cc: adapter.kayttoOikeudet && projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}
