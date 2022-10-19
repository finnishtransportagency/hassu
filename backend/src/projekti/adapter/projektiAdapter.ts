import { DBProjekti } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "../kayttoOikeudetManager";
import { personSearch } from "../../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import { lisaAineistoService } from "../../aineisto/lisaAineistoService";
import { adaptKielitiedotByAddingTypename, adaptLiittyvatSuunnitelmatByAddingTypename } from "./common";
import {
  adaptAloitusKuulutus,
  adaptAloitusKuulutusJulkaisut,
  adaptHyvaksymisPaatosVaihe,
  adaptHyvaksymisPaatosVaiheJulkaisut,
  adaptKasittelynTila,
  adaptNahtavillaoloVaihe,
  adaptNahtavillaoloVaiheJulkaisut,
  adaptSuunnitteluSopimus,
  adaptSuunnitteluVaihe,
} from "./adaptToAPI";
import {
  adaptAloitusKuulutusToSave,
  adaptHyvaksymisPaatosVaiheToSave,
  adaptNahtavillaoloVaiheToSave,
  adaptSuunnitteluSopimusToSave,
  adaptSuunnitteluVaiheToSave,
  adaptVuorovaikutusToSave,
} from "./adaptToDB";
import { applyProjektiStatus } from "../status/projektiStatusHandler";
import { adaptKasittelynTilaToSave } from "./adaptToDB/adaptKasittelynTilaToSave";
import { ProjektiAdaptationResult } from "./projektiAdaptationResult";

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti, virhetiedot?: API.ProjektiVirhe): API.Projekti {
    const {
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      liittyvatSuunnitelmat,
      aloitusKuulutusJulkaisut,
      velho,
      kielitiedot,
      suunnitteluVaihe,
      vuorovaikutukset,
      nahtavillaoloVaihe,
      nahtavillaoloVaiheJulkaisut,
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut,
      jatkoPaatos1Vaihe,
      jatkoPaatos1VaiheJulkaisut,
      jatkoPaatos2Vaihe,
      jatkoPaatos2VaiheJulkaisut,
      salt: _salt,
      kasittelynTila,
      ...fieldsToCopyAsIs
    } = dbProjekti;

    const apiProjekti: API.Projekti = removeUndefinedFields({
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: KayttoOikeudetManager.adaptAPIKayttoOikeudet(kayttoOikeudet),
      tyyppi: velho?.tyyppi || dbProjekti.tyyppi, // remove usage of projekti.tyyppi after all data has been migrated to new format
      aloitusKuulutus: adaptAloitusKuulutus(aloitusKuulutus),
      suunnitteluSopimus: adaptSuunnitteluSopimus(dbProjekti.oid, suunnitteluSopimus),
      liittyvatSuunnitelmat: adaptLiittyvatSuunnitelmatByAddingTypename(liittyvatSuunnitelmat),
      aloitusKuulutusJulkaisut: adaptAloitusKuulutusJulkaisut(dbProjekti.oid, aloitusKuulutusJulkaisut),
      velho: {
        __typename: "Velho",
        ...velho,
      },
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot, true),
      suunnitteluVaihe: adaptSuunnitteluVaihe(dbProjekti.oid, kayttoOikeudet, suunnitteluVaihe, vuorovaikutukset),
      nahtavillaoloVaihe: adaptNahtavillaoloVaihe(dbProjekti, nahtavillaoloVaihe),
      nahtavillaoloVaiheJulkaisut: adaptNahtavillaoloVaiheJulkaisut(dbProjekti.oid, nahtavillaoloVaiheJulkaisut),
      hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaihe(hyvaksymisPaatosVaihe, dbProjekti.kasittelynTila?.hyvaksymispaatos),
      hyvaksymisPaatosVaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        hyvaksymisPaatosVaiheJulkaisut
      ),
      jatkoPaatos1Vaihe: adaptHyvaksymisPaatosVaihe(jatkoPaatos1Vaihe, dbProjekti.kasittelynTila?.ensimmainenJatkopaatos),
      jatkoPaatos1VaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
        jatkoPaatos1VaiheJulkaisut
      ),
      jatkoPaatos2Vaihe: adaptHyvaksymisPaatosVaihe(jatkoPaatos2Vaihe, dbProjekti.kasittelynTila?.toinenJatkopaatos),
      jatkoPaatos2VaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        dbProjekti.kasittelynTila?.toinenJatkopaatos,
        jatkoPaatos2VaiheJulkaisut
      ),
      virhetiedot,
      kasittelynTila: adaptKasittelynTila(kasittelynTila),
      ...fieldsToCopyAsIs,
    });

    if (apiProjekti.tallennettu) {
      applyProjektiStatus(apiProjekti);
    }
    return apiProjekti;
  }

  async adaptProjektiToPreview(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    return mergeWith(projekti, (await this.adaptProjektiToSave(projekti, changes)).projekti);
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<ProjektiAdaptationResult> {
    // Pick only fields that are relevant to DB
    const {
      oid,
      muistiinpano,
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      kielitiedot,
      euRahoitus,
      liittyvatSuunnitelmat,
      suunnitteluVaihe,
      nahtavillaoloVaihe,
      kasittelynTila,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    } = changes;
    const projektiAdaptationResult: ProjektiAdaptationResult = new ProjektiAdaptationResult(projekti);
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    const vuorovaikutukset = adaptVuorovaikutusToSave(projekti, projektiAdaptationResult, suunnitteluVaihe?.vuorovaikutus);
    const aloitusKuulutusToSave = adaptAloitusKuulutusToSave(aloitusKuulutus);
    const dbProjekti: DBProjekti = mergeWith(
      {},
      {
        oid,
        muistiinpano,
        aloitusKuulutus: aloitusKuulutusToSave,
        suunnitteluSopimus: adaptSuunnitteluSopimusToSave(projekti, suunnitteluSopimus),
        kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        suunnitteluVaihe: adaptSuunnitteluVaiheToSave(projekti, suunnitteluVaihe),
        nahtavillaoloVaihe: adaptNahtavillaoloVaiheToSave(
          projekti.nahtavillaoloVaihe,
          nahtavillaoloVaihe,
          projektiAdaptationResult,
          projekti.nahtavillaoloVaiheJulkaisut?.length
        ),
        hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaiheToSave(
          projekti.hyvaksymisPaatosVaihe,
          hyvaksymisPaatosVaihe,
          projektiAdaptationResult,
          projekti.hyvaksymisPaatosVaiheJulkaisut?.length
        ),
        jatkoPaatos1Vaihe: adaptHyvaksymisPaatosVaiheToSave(
          projekti.jatkoPaatos1Vaihe,
          jatkoPaatos1Vaihe,
          projektiAdaptationResult,
          projekti.jatkoPaatos1VaiheJulkaisut?.length
        ),
        jatkoPaatos2Vaihe: adaptHyvaksymisPaatosVaiheToSave(
          projekti.jatkoPaatos2Vaihe,
          jatkoPaatos2Vaihe,
          projektiAdaptationResult,
          projekti.jatkoPaatos2VaiheJulkaisut?.length
        ),
        kielitiedot,
        euRahoitus,
        liittyvatSuunnitelmat,
        vuorovaikutukset,
        salt: projekti.salt || lisaAineistoService.generateSalt(),
        kasittelynTila: adaptKasittelynTilaToSave(projekti.kasittelynTila, kasittelynTila, projektiAdaptationResult),
      }
    );
    projektiAdaptationResult.setProjekti(dbProjekti);
    return projektiAdaptationResult;
  }
}

function removeUndefinedFields(object: API.Projekti): API.Projekti {
  return { __typename: "Projekti", oid: object.oid, velho: object.velho, ...pickBy(object, (value) => value !== undefined) };
}

export const projektiAdapter = new ProjektiAdapter();
