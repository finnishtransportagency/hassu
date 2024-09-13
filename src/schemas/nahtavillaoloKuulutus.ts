import * as Yup from "yup";
import { ilmoituksenVastaanottajat, standardiYhteystiedot } from "hassu-common/schema/common";
import { lokalisoituTeksti } from "./lokalisoituTeksti";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import { kuulutusSaamePDFtInput } from "./kuulutusSaamePDFtInput";
import { uudelleenKuulutus } from "./uudelleenKuulutus";

const maxNahtavillaoloLength = 2000;

export const nahtavillaoloKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  nahtavillaoloVaihe: Yup.object()
    .required()
    .shape({
      kuulutusYhteystiedot: standardiYhteystiedot(),
      hankkeenKuvaus: lokalisoituTeksti({
        requiredText: "Hankkeen kuvaus ei voi olla tyhjä",
        additionalStringValidations: (schema) =>
          schema.max(maxNahtavillaoloLength, `Nähtävilläolovaiheeseen voidaan kirjoittaa maksimissaan ${maxNahtavillaoloLength} merkkiä`),
      }),
      uudelleenKuulutus: uudelleenKuulutus({
        uudelleenKuulutusKey: "$projekti.nahtavillaoloVaihe.uudelleenKuulutus",
        requiredText: "Seloste on annettava",
      }),
      kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required(
        "Kuulutuspäivä ei voi olla tyhjä"
      ),
      kuulutusVaihePaattyyPaiva: paivamaara(),
      muistutusoikeusPaattyyPaiva: paivamaara(),
      ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
      nahtavillaoloSaamePDFt: kuulutusSaamePDFtInput(true),
    }),
});
