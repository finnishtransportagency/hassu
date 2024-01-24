import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";
import { getLadatutTiedostotSchema } from "./common";

export const lausuntopyynnotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().required(),
  lausuntoPyynnot: Yup.array().of(
    Yup.object({
      uuid: Yup.string().required(),
      poistumisPaiva: paivamaara({ preventPast: false, preventFuture: false }),
      muistiinpano: Yup.string().test({
        message: "vain_kuva_tai_pdf",
        test: (a, context) => {
          console.log("HELLO a" + a + context);
          return false;
        },
      }),
      lisaAineistot: getLadatutTiedostotSchema(),
      poistetutLisaAineisto: getLadatutTiedostotSchema(),
    })
  ),
});

export const lausuntopyynnonTaydennyksetSchema = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().required(),
  lausuntopyynnonTaydennykset: Yup.array().of(
    Yup.object({
      uuid: Yup.string().required(),
      poistumisPaiva: paivamaara({ preventPast: false, preventFuture: false }),
      kunta: Yup.number().required(),
      muuAineisto: getLadatutTiedostotSchema(),
      poistetutMuuAineisto: getLadatutTiedostotSchema(),
      muistutukset: Yup.array().of(Yup.mixed()).nullable(),
      poistetutMuistutukset: Yup.array().of(Yup.mixed()).nullable(),
    })
  ),
});
