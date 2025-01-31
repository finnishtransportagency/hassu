import * as Yup from "yup";
import { ELY, KayttajaTyyppi, ProjektiKayttajaInput } from "../../common/graphql/apiModel";
import { addAgencyNumberTests, puhelinNumeroSchema } from "hassu-common/schema/puhelinNumero";
import { isAorLTunnus } from "hassu-common/util/isAorLTunnus";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";

export const kayttoOikeudetSchema = Yup.array().of(
  Yup.object()
    .shape({
      organisaatio: Yup.string().notRequired(),
      puhelinnumero: puhelinNumeroSchema.when("kayttajatunnus", {
        is: isAorLTunnus,
        then: addAgencyNumberTests,
      }),
      kayttajatunnus: Yup.string().required("Aseta käyttäjä"),
      id: Yup.string().nullable().notRequired(),
      tyyppi: Yup.mixed<KayttajaTyyppi>()
        .oneOf([KayttajaTyyppi.PROJEKTIPAALLIKKO, KayttajaTyyppi.VARAHENKILO, null])
        .notRequired()
        .nullable(true),
      yleinenYhteystieto: Yup.boolean().notRequired(),
      elyOrganisaatio: Yup.mixed()
        .oneOf([...Object.values(ELY), undefined, null])
        .when("organisaatio", {
          is: organisaatioIsEly,
          then: (schema) => schema.required("ELY-keskus on pakollinen"),
        }),
    })
    .test("uniikki-kayttajatunnus", "Käyttäjä voi olla vain yhteen kertaan käyttöoikeuslistalla", function (current) {
      const currentKayttaja = current as ProjektiKayttajaInput;
      const kayttajaList = this.parent as ProjektiKayttajaInput[];
      const muutKayttajat = kayttajaList.filter((kayttaja) => kayttaja !== currentKayttaja);

      const isDuplicate = muutKayttajat.some((kayttaja) => kayttaja.kayttajatunnus === currentKayttaja.kayttajatunnus);
      return isDuplicate ? this.createError({ path: `${this.path}.kayttajatunnus` }) : true;
    })
);
