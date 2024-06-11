import * as Yup from "yup";
import { ilmoituksenVastaanottajat, standardiYhteystiedot } from "hassu-common/schema/common";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import { uudelleenKuulutus } from "./uudelleenKuulutus";
import { lokalisoituTeksti } from "./lokalisoituTeksti";
import { kuulutusSaamePDFtInput } from "./kuulutusSaamePDFtInput";

const maxAloituskuulutusLength = 2000;

export const aloituskuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  aloitusKuulutus: Yup.object().shape({
    kuulutusYhteystiedot: standardiYhteystiedot(),
    hankkeenKuvaus: lokalisoituTeksti({
      requiredText: "Hankkeen kuvaus ei voi olla tyhjä",
      additionalStringValidations: (schema) =>
        schema.max(maxAloituskuulutusLength, `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä`),
    }),
    kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required("Kuulutuspäivä ei voi olla tyhjä"),
    siirtyySuunnitteluVaiheeseen: paivamaara(),
    uudelleenKuulutus: uudelleenKuulutus({
      uudelleenKuulutusKey: "$projekti.aloitusKuulutus.uudelleenKuulutus",
      requiredText: "Seloste on annettava",
    }),
    ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    aloituskuulutusSaamePDFt: kuulutusSaamePDFtInput().required(),
  }),
});
