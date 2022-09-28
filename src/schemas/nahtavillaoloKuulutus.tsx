import * as Yup from "yup";
import { yhteystietoSchema } from "./yhteystieto";
import { ilmoituksenVastaanottajat } from "./common";
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
      kuulutusYhteystiedot: Yup.array().notRequired().of(yhteystietoSchema),
      kuulutusYhteysHenkilot: Yup.array().notRequired().of(Yup.string()),
      hankkeenKuvaus: Yup.object().shape({ SUOMI: hankkeenKuvaus }),
      kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required(
        "Kuulutuspäivä ei voi olla tyhjä"
      ),
      kuulutusVaihePaattyyPaiva: paivamaara(),
      muistutusoikeusPaattyyPaiva: paivamaara(),
      ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    }),
});
