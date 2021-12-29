import * as Yup from "yup";
import { ProjektiKayttajaInput, ProjektiRooli } from "@services/api";
import { puhelinNumeroSchema } from "./puhelinNumero";

export const kayttoOikeudetSchema = Yup.array()
  .of(
    Yup.object()
      .shape({
        rooli: Yup.mixed().oneOf(Object.values(ProjektiRooli), "Käyttäjälle on asetettava rooli"),
        puhelinnumero: puhelinNumeroSchema,
        kayttajatunnus: Yup.string().required("Aseta käyttäjä"),
        esitetaanKuulutuksessa: Yup.boolean().nullable().notRequired(),
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
    const listContainsProjektiPaallikko =
      !!list && (list as ProjektiKayttajaInput[]).some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
    return listContainsProjektiPaallikko;
  })
  .test("singular-projektipaallikko", "Projektilla voi olla vain yksi projektipäällikkö", (list) => {
    const listContainsProjektiPaallikko =
      !!list &&
      (list as ProjektiKayttajaInput[]).filter(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO).length < 2;
    return listContainsProjektiPaallikko;
  });
