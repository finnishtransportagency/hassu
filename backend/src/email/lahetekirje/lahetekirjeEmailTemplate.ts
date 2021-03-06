import Mail from "nodemailer/lib/mailer";
import { AsiakirjanMuoto } from "../../asiakirja/asiakirjaService";
import { DBProjekti } from "../../database/model/projekti";
import { EmailOptions } from "../email";
import { LahetekirjeAdapter, LahetekirjeTiedot } from "./LahetekirjeAdapter";

const lahetekirjeOtsikko11T = ({ nimi }: LahetekirjeTiedot) =>
  `TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA ILMOITTAMINEN - ${nimi}`;

const lahetekirjeOtsikko11R = ({ nimi }: LahetekirjeTiedot) => `VÄYLÄVIRASTON KUULUTUKSESTA ILMOITTAMINEN - ${nimi}`;

const lahetekirje11T = ({
  nimi,
  tilaajaPitka,
  kuulutuksenSyy,
  kuulutusPvm,
  tilaajaGenetiivi,
  kuulutusUrl,
  tietosuojaUrl,
  tilaajaLyhyt,
  hankkeenKuvaus,
  tilaajaAllatiivi,
  yhteystiedot,
}: LahetekirjeTiedot) => {
  const paragraphs = [
    "TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA ILMOITTAMINEN",
    nimi,
    `${tilaajaPitka} ilmoittaa, että se julkaisee liikennejärjestelmästä ja maanteistä annetun lain sekä hallintolain 62 a §:n mukaisesti tietoverkossaan kuulutuksen, joka koskee ${kuulutuksenSyy}. ${tilaajaLyhyt} saattaa asian tiedoksi julkisesti kuuluttamalla vähintään 30 päivän ajan siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä.`,
    `Kuulutus julkaistaan ${kuulutusPvm}, ${tilaajaGenetiivi} tietoverkossa osoitteessa ${kuulutusUrl}.`,
    `${tilaajaLyhyt} pyytää suunnittelualueen kuntia julkisemaan julkaisemaan tietoverkossaan (sähköinen ilmoitustaulu) liitteenä olevan ilmoituksen kuuluttamisesta. Ilmoitus tulee julkaista tietoverkossa mahdollisuuksien mukaan edellä mainittuna kuulutuksen julkaisupäivänä. Ilmoituksen nähtävillä oloa ei tarvitse todentaa ${tilaajaAllatiivi}.`,
    hankkeenKuvaus,
    `${tilaajaLyhyt} käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa ${tietosuojaUrl}.`,
    `Lisätietoja antaa\n${yhteystiedot.join("\n")}`,
  ];
  return paragraphs.join("\n\n");
};

const lahetekirje11R = ({
  nimi,
  kuulutusPvm,
  tilaajaGenetiivi,
  kuulutusUrl,
  tietosuojaUrl,
  hankkeenKuvaus,
  yhteystiedot,
  suunnitelmaTyyppi,
}: LahetekirjeTiedot) => {
  const paragraphs = [
    "VÄYLÄVIRASTON KUULUTUKSESTA ILMOITTAMINEN",
    nimi,
    `Väylävirasto ilmoittaa, että se julkaisee kuulutuksen, joka koskee otsikossa mainitun ${suunnitelmaTyyppi}n ja maastotöiden aloittamista. Väylävirasto saattaa asian tiedoksi julkisesti kuuluttamalla vähintään 30 päivän ajan siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. (ratalaki 95 § ja HL 62 a §)`,
    `Kuulutus julkaistaan ${kuulutusPvm}, ${tilaajaGenetiivi} tietoverkossa osoitteessa ${kuulutusUrl}.`,
    `Väylävirasto pyytää suunnittelualueen kuntia julkaisemaan julkaisemaan tietoverkossaan (sähköinen ilmoitustaulu) liitteenä olevan ilmoituksen kuuluttamisesta. Ilmoitus tulee julkaista tietoverkossa mahdollisuuksien mukaan edellä mainittuna kuulutuksen julkaisupäivänä. Ilmoituksen nähtävillä oloa ei tarvitse todentaa Väylävirastolle.`,
    `Väylävirasto liittää oheen ilmoituksen, jota kunta ja ELY-keskus voi käyttää sellaisenaan. Jos kunta tai ELY-keskus laatii oman ilmoituksen, sitä pyydetään kuitenkin käyttämään oheisessa ilmoituksessa olevaa hankkeen nimeä sellaisenaan sekä käyttämään ilmoituksessa olevaa linkkiä.`,
    hankkeenKuvaus,
    `Väylävirasto käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa ${tietosuojaUrl}.`,
    `Lisätietoja antaa \n${yhteystiedot.join("\n")}`,
  ];
  return paragraphs.join("\n\n");
};

export function createLahetekirjeEmail(projekti: DBProjekti): EmailOptions {
  const tiedot = new LahetekirjeAdapter(projekti).lahetekirjeTiedot;
  const subject =
    tiedot.asiakirjanMuoto === AsiakirjanMuoto.RATA ? lahetekirjeOtsikko11R(tiedot) : lahetekirjeOtsikko11T(tiedot);
  const text = tiedot.asiakirjanMuoto === AsiakirjanMuoto.RATA ? lahetekirje11R(tiedot) : lahetekirje11T(tiedot);
  const attachments = createAttachments(projekti);
  return {
    subject,
    text,
    to: tiedot.vastaanottajat,
    attachments,
  };
}

function createAttachments(_: DBProjekti): Mail.Attachment[] {
  return [];
}
