import * as Yup from "yup";
import { ilmoituksenVastaanottajat, standardiYhteystiedot } from "./common";
import { paivamaara } from "./paivamaaraSchema";

export const hyvaksymispaatosKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  paatos: Yup.object()
    .required()
    .shape({
      hallintoOikeus: Yup.string().required("Hallinto-oikeus on annettava"),
      kuulutusYhteystiedot: standardiYhteystiedot(),
      kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required(
        "Kuulutuspäivä ei voi olla tyhjä"
      ),
      kuulutusVaihePaattyyPaiva: paivamaara(),
      ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    }),
});
