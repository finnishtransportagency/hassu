import * as Yup from "yup";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import { getLadatutTiedostotSchema } from "hassu-common/schema/common";

const maxNoteLength = 2000;

export const lausuntopyynnotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().required(),
  lausuntoPyynnot: Yup.array().of(
    Yup.object({
      uuid: Yup.string().required(),
      poistumisPaiva: paivamaara({ preventPast: false, preventFuture: false }),
      muistiinpano: Yup.string().max(maxNoteLength, `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`),
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
