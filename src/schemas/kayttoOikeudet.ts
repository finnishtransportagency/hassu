import * as Yup from "yup";
import { Kayttaja, ProjektiKayttajaInput, ProjektiRooli, VaylaKayttajaTyyppi } from "../../common/graphql/apiModel";
import { addAgencyNumberTests, puhelinNumeroSchema } from "./puhelinNumero";

export interface KayttoOikeudetSchemaContext {
  kayttajat: Kayttaja[];
}

const kayttajaIsAorL = (kayttajat?: Kayttaja[] | null, kayttajatunnus?: string | null) =>
  kayttajat?.find(
    ({ vaylaKayttajaTyyppi, uid }) =>
      uid === kayttajatunnus &&
      (VaylaKayttajaTyyppi.A_TUNNUS === vaylaKayttajaTyyppi || VaylaKayttajaTyyppi.L_TUNNUS === vaylaKayttajaTyyppi)
  );

export const kayttoOikeudetSchema = Yup.array()
  .of(
    Yup.object()
      .shape({
        rooli: Yup.mixed().oneOf(Object.values(ProjektiRooli), "Käyttäjälle on asetettava rooli"),
        puhelinnumero: puhelinNumeroSchema.when(["$kayttajat", "kayttajatunnus"], {
          is: kayttajaIsAorL,
          then: addAgencyNumberTests,
        }),
        kayttajatunnus: Yup.string().required("Aseta käyttäjä"),
        esitetaanKuulutuksessa: Yup.boolean().nullable().notRequired(),
        id: Yup.string().nullable().notRequired(),
      })
      .test("uniikki-kayttajatunnus", "Käyttäjä voi olla vain yhteen kertaan käyttöoikeuslistalla", function (current) {
        const currentKayttaja = current as ProjektiKayttajaInput;
        const kayttajaList = this.parent as ProjektiKayttajaInput[];
        const muutKayttajat = kayttajaList.filter((kayttaja) => kayttaja !== currentKayttaja);

        const isDuplicate = muutKayttajat.some(
          (kayttaja) => kayttaja.kayttajatunnus === currentKayttaja.kayttajatunnus
        );
        return isDuplicate ? this.createError({ path: `${this.path}.kayttajatunnus` }) : true;
      })
  )
  .test("must-contain-projektipaallikko", "Projektille täytyy määrittää projektipäällikkö", (list) => {
    return !!list && (list as ProjektiKayttajaInput[]).some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  })
  .test("singular-projektipaallikko", "Projektilla voi olla vain yksi projektipäällikkö", (list) => {
    return (
      !!list &&
      (list as ProjektiKayttajaInput[]).filter(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO).length < 2
    );
  });
