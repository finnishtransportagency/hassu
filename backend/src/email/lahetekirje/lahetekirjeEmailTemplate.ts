import { EmailOptions } from "../email";
import { AloituskuulutusKutsuAdapter } from "../../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { projektiPaallikkoJaVarahenkilotEmails } from "../emailTemplates";

const lahetekirje11 = (adapter: AloituskuulutusKutsuAdapter) => {
  const paragraphs = [
    adapter.nimi,
    adapter.uudelleenKuulutusSeloste,
    "{{kuuluttaja_pitka}} ilmoittaa, että se julkaisee kuulutuksen, joka koskee otsikossa mainitun {{suunnitelman}} " +
      "ja maastotöiden aloittamista. {{kuuluttaja}} saattaa asian tiedoksi julkisesti kuuluttamalla vähintään 30 päivän ajan siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen vähintään " +
      "yhdessä alueella yleisesti ilmestyvässä sanomalehdessä. ({{lakiviite_kunnan_ilmoitus}})",
    "Kuulutus julkaistaan {{kuulutusPaiva}} osoitteessa {{aloituskuulutusUrl}}.",
    "Suunnittelualueen kuntia pyydetään julkaisemaan liitteenä oleva ilmoitus kuulutuksesta verkkosivuillaan. Ilmoitus tulee julkaista mahdollisuuksien mukaan edellä mainittuna kuulutuksen julkaisupäivänä. Ilmoituksen nähtävillä oloa ei tarvitse todentaa ilmoituksen lähettäjälle. Ilmoitus menee ELY-keskuksen ja Väyläviraston kuulutussivulle automaattisesti Valtion liikenneväylien suunnittelu palvelun kautta.",
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
  const subject = adapter.substituteText("{{kuuluttaja_pitka}} kuulutuksesta ilmoittaminen");
  const text = lahetekirje11(adapter);
  return {
    subject,
    text,
    to: adapter.laheteKirjeVastaanottajat,
    cc: adapter.kayttoOikeudet && projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}
