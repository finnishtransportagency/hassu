import * as Yup from "yup";
import { KayttajaTyyppi, ProjektiKayttajaInput } from "../../common/graphql/apiModel";
import { addAgencyNumberTests, puhelinNumeroSchema } from "./puhelinNumero";
import { isAorL } from "../../backend/src/util/userUtil";

export interface KayttoOikeudetSchemaContext {
  kayttajat: ProjektiKayttajaInput[];
}

const kayttajaIsAorL = (projektiKayttajat?: ProjektiKayttajaInput[] | null, kayttajatunnus?: string | null) =>
  projektiKayttajat?.find(
    (projektiKayttaja) => projektiKayttaja.kayttajatunnus && projektiKayttaja.kayttajatunnus === kayttajatunnus && isAorL(kayttajatunnus)
  );

export const kayttoOikeudetSchema = Yup.array().of(
  Yup.object()
    .shape({
      puhelinnumero: puhelinNumeroSchema.when(["$kayttajat", "kayttajatunnus"], {
        is: kayttajaIsAorL,
        then: addAgencyNumberTests,
      }),
      kayttajatunnus: Yup.string().required("Aseta käyttäjä"),
      id: Yup.string().nullable().notRequired(),
      tyyppi: Yup.mixed<KayttajaTyyppi>().oneOf([KayttajaTyyppi.PROJEKTIPAALLIKKO, KayttajaTyyppi.VARAHENKILO]).notRequired().nullable(),
      yleinenYhteystieto: Yup.boolean().notRequired(),
    })
    .test("uniikki-kayttajatunnus", "Käyttäjä voi olla vain yhteen kertaan käyttöoikeuslistalla", function (current) {
      const currentKayttaja = current as ProjektiKayttajaInput;
      const kayttajaList = this.parent as ProjektiKayttajaInput[];
      const muutKayttajat = kayttajaList.filter((kayttaja) => kayttaja !== currentKayttaja);

      const isDuplicate = muutKayttajat.some((kayttaja) => kayttaja.kayttajatunnus === currentKayttaja.kayttajatunnus);
      return isDuplicate ? this.createError({ path: `${this.path}.kayttajatunnus` }) : true;
    })
);
