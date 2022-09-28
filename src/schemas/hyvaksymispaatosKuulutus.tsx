import * as Yup from "yup";
import { ilmoituksenVastaanottajat } from "./common";
import { yhteystietoSchema } from "./yhteystieto";
import { paivamaara } from "./paivamaaraSchema";

export const hyvaksymispaatosKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  hyvaksymisPaatosVaihe: Yup.object()
    .required()
    .shape({
      hallintoOikeus: Yup.string().required("Hallinto-oikeus on annettava"),
      kuulutusYhteystiedot: Yup.array().notRequired().of(yhteystietoSchema),
      kuulutusYhteysHenkilot: Yup.array().notRequired().of(Yup.string()),
      kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required(
        "Kuulutuspäivä ei voi olla tyhjä"
      ),
      kuulutusVaihePaattyyPaiva: paivamaara(),
      ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    }),
});
