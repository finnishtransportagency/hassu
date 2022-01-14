import { AloitusKuulutus, DBProjekti, Suunnitelma, SuunnitteluSopimus } from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import { Yhteystieto } from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import { personSearch } from "../personSearch/personSearchClient";

function removeUndefinedFields(object: any) {
  return pickBy(object, identity);
}

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti): API.Projekti {
    const { kayttoOikeudet, tyyppi, aloitusKuulutus, suunnitteluSopimus, liittyvatSuunnitelmat, ...fieldsToCopyAsIs } =
      dbProjekti;
    return removeUndefinedFields({
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: KayttoOikeudetManager.adaptAPIKayttoOikeudet(dbProjekti.kayttoOikeudet),
      tyyppi: tyyppi as API.ProjektiTyyppi,
      aloitusKuulutus: adaptAloitusKuulutus(aloitusKuulutus),
      suunnitteluSopimus: adaptSuunnitteluSopimus(suunnitteluSopimus),
      liittyvatSuunnitelmat: adaptLiittyvatSuunnitelmat(liittyvatSuunnitelmat),
      ...fieldsToCopyAsIs,
    }) as API.Projekti;
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    // Pick only fields that are relevant to DB
    const {
      oid,
      muistiinpano,
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      lisakuulutuskieli,
      eurahoitus,
      liittyvatSuunnitelmat,
    } = changes;
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    return mergeWith(
      {},
      {
        oid,
        muistiinpano,
        aloitusKuulutus,
        suunnitteluSopimus: adaptSuunnitteluSopimusToSave(projekti, suunnitteluSopimus),
        kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        lisakuulutuskieli,
        eurahoitus,
        liittyvatSuunnitelmat,
      }
    ) as DBProjekti;
  }
}

function adaptLiittyvatSuunnitelmat(suunnitelmat?: Suunnitelma[] | null): API.Suunnitelma[] | undefined | null {
  if (suunnitelmat) {
    const liittyvatSuunnitelmat = suunnitelmat.map(
      (suunnitelma) =>
        ({
          __typename: "Suunnitelma",
          ...suunnitelma,
        } as Suunnitelma)
    );
    return liittyvatSuunnitelmat as API.Suunnitelma[];
  }
  return suunnitelmat as undefined | null;
}

function adaptSuunnitteluSopimusToSave(
  projekti: DBProjekti,
  suunnitteluSopimusInput?: API.SuunnitteluSopimusInput | null
): API.SuunnitteluSopimusInput | null | undefined {
  if (suunnitteluSopimusInput) {
    const { logo, ...rest } = suunnitteluSopimusInput;
    return { ...rest, logo: logo || projekti.suunnitteluSopimus?.logo };
  }
  return suunnitteluSopimusInput as null | undefined;
}

function adaptAloitusKuulutus(kuulutus?: AloitusKuulutus): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    const { esitettavatYhteystiedot, ...otherKuulutusFields } = kuulutus;
    const yhteystiedot: API.Yhteystieto[] | undefined = esitettavatYhteystiedot?.map(
      (yhteystieto) =>
        ({
          __typename: "Yhteystieto",
          ...yhteystieto,
        } as Yhteystieto)
    );
    return {
      __typename: "AloitusKuulutus",
      esitettavatYhteystiedot: yhteystiedot,
      ...otherKuulutusFields,
    };
  }
  return kuulutus as undefined | null;
}

function adaptSuunnitteluSopimus(
  suunnitteluSopimus?: SuunnitteluSopimus | null
): API.SuunnitteluSopimus | undefined | null {
  if (suunnitteluSopimus) {
    return { __typename: "SuunnitteluSopimus", ...suunnitteluSopimus };
  }
  return suunnitteluSopimus as undefined | null;
}

export const projektiAdapter = new ProjektiAdapter();
