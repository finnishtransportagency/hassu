import * as Yup from "yup";
import { ilmoituksenVastaanottajat, standardiYhteystiedot } from "hassu-common/schema/common";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import { uudelleenKuulutus } from "./uudelleenKuulutus";

export const paatosKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  paatos: Yup.object()
    .required()
    .shape({
      hallintoOikeus: Yup.string().required("Hallinto-oikeus on annettava"),
      kuulutusYhteystiedot: standardiYhteystiedot(),
      kuulutusPaiva: paivamaara({ preventPast: "Kuulutuspäivää ei voida asettaa menneisyyteen" }).required(
        "Kuulutuspäivä ei voi olla tyhjä"
      ),
      uudelleenKuulutus: uudelleenKuulutus({
        uudelleenKuulutusKey: "$paatos.uudelleenKuulutus",
        requiredText: "Seloste on annettava",
      }),
      kuulutusVaihePaattyyPaiva: paivamaara(),
      ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    }),
});
