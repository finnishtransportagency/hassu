import * as Yup from "yup";
import { ilmoituksenVastaanottajat, standardiYhteystiedot } from "./common";
import { paivamaara } from "./paivamaaraSchema";

const maxNahtavillaoloLength = 2000;

let hankkeenKuvaus = Yup.string()
  .max(maxNahtavillaoloLength, `Nähtävilläolovaiheeseen voidaan kirjoittaa maksimissaan ${maxNahtavillaoloLength} merkkiä`)
  .required("Hankkeen kuvaus ei voi olla tyhjä")
  .nullable();

export const nahtavillaoloKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  nahtavillaoloVaihe: Yup.object()
    .required()
    .shape({
      kuulutusYhteystiedot: standardiYhteystiedot(),
      hankkeenKuvaus: Yup.object().shape({ SUOMI: hankkeenKuvaus }),
      kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required(
        "Kuulutuspäivä ei voi olla tyhjä"
      ),
      kuulutusVaihePaattyyPaiva: paivamaara(),
      muistutusoikeusPaattyyPaiva: paivamaara(),
      ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    }),
});
