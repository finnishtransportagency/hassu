import { DBProjekti, SuunnitteluSopimus } from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";

function removeUndefinedFields(object: any) {
  return pickBy(object, identity);
}

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti): API.Projekti {
    const { kayttoOikeudet, tyyppi, aloitusKuulutus, suunnitteluSopimus, ...fieldsToCopyAsIs } = dbProjekti;
    return removeUndefinedFields({
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: new KayttoOikeudetManager(dbProjekti.kayttoOikeudet).getAPIKayttoOikeudet(),
      tyyppi: tyyppi as API.ProjektiTyyppi,
      aloitusKuulutus: adaptAloitusKuulutus(aloitusKuulutus),
      suunnitteluSopimus: adaptSuunnitteluSopimus(suunnitteluSopimus),
      ...fieldsToCopyAsIs,
    }) as API.Projekti;
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    // Pick only fields that are relevant to DB
    const { oid, muistiinpano, kayttoOikeudet, aloitusKuulutus, suunnitteluSopimus, lisakuulutuskieli } = changes;
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet);
    await kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    return removeUndefinedFields(
      mergeWith(
        {},
        {
          oid,
          muistiinpano,
          aloitusKuulutus,
          suunnitteluSopimus,
          kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
          lisakuulutuskieli,
        }
      )
    ) as DBProjekti;
  }
}

function adaptAloitusKuulutus(kuulutus?: Partial<API.AloitusKuulutus>): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    const { esitettavatYhteystiedot, ...otherKuulutusFields } = kuulutus;
    const yhteystiedot: API.Yhteystieto[] = esitettavatYhteystiedot?.map((yhteystieto) => ({
      __typename: "Yhteystieto",
      ...yhteystieto,
    }));
    return {
      __typename: "AloitusKuulutus",
      esitettavatYhteystiedot: yhteystiedot,
      ...otherKuulutusFields,
    };
  }
  return undefined;
}

function adaptSuunnitteluSopimus(suunnitteluSopimus?: SuunnitteluSopimus): API.SuunnitteluSopimus | undefined {
  if (suunnitteluSopimus) {
    return { __typename: "SuunnitteluSopimus", ...suunnitteluSopimus };
  }
  return undefined;
}

export const projektiAdapter = new ProjektiAdapter();
