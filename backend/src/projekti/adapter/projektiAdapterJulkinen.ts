import { DBProjekti, DBVaylaUser } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiJulkinen, Status } from "hassu-common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { findUserByKayttajatunnus } from "../projektiUtil";
import { applyProjektiJulkinenStatus } from "../status/projektiJulkinenStatusHandler";
import {
  adaptLogotToAPIJulkinen,
  adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisuJulkinen,
  adaptProjektiKayttajaJulkinen,
  adaptKielitiedotByAddingTypename,
  adaptAloitusKuulutusJulkaisuJulkinen,
  adaptVelhoJulkinen,
  adaptVuorovaikutusKierroksetJulkinen,
  adaptNahtavillaoloVaiheJulkaisuJulkinen,
  adaptHyvaksymisPaatosVaiheJulkinen,
} from "./adaptToAPI";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { ProjektiScheduleManager } from "../../sqsEvents/projektiScheduleManager";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { isProjektiJulkinenStatusPublic } from "hassu-common/isProjektiJulkinenStatusPublic";

export function getPaatosTyyppi(asiakirjaTyyppi: API.AsiakirjaTyyppi) {
  if (
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.JATKOPAATOSKUULUTUS ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE
  ) {
    return PaatosTyyppi.JATKOPAATOS1;
  } else if (
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2 ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2 ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE
  ) {
    return PaatosTyyppi.JATKOPAATOS2;
  } else {
    return PaatosTyyppi.HYVAKSYMISPAATOS;
  }
}

class ProjektiAdapterJulkinen {
  public async adaptProjekti(
    dbProjekti: DBProjekti,
    kieli: KaannettavaKieli | undefined = undefined,
    returnUndefinedForNonPublic: boolean = true
  ): Promise<ProjektiJulkinen | undefined> {
    if (!dbProjekti.velho) {
      throw new Error("adaptProjekti: dbProjekti.velho määrittelemättä");
    }
    const aloitusKuulutusJulkaisu = await adaptAloitusKuulutusJulkaisuJulkinen(dbProjekti, dbProjekti.aloitusKuulutusJulkaisut, kieli);
    if (!aloitusKuulutusJulkaisu) {
      return {
        __typename: "ProjektiJulkinen",
        oid: dbProjekti.oid,
        velho: { __typename: "VelhoJulkinen" },
        status: Status.EI_JULKAISTU,
      };
    }

    const projektiHenkilot: API.ProjektiKayttajaJulkinen[] = adaptProjektiHenkilot(
      dbProjekti.kayttoOikeudet,
      dbProjekti.suunnitteluSopimus?.yhteysHenkilo
    );

    const vuorovaikutukset = adaptVuorovaikutusKierroksetJulkinen(dbProjekti);
    const nahtavillaoloVaihe = await adaptNahtavillaoloVaiheJulkaisuJulkinen(dbProjekti, kieli);
    const suunnitteluSopimus = adaptRootSuunnitteluSopimusJulkaisu(dbProjekti);
    const euRahoitusLogot = adaptLogotToAPIJulkinen(dbProjekti.oid, dbProjekti.euRahoitusLogot);
    const projektiScheduleManager = new ProjektiScheduleManager(dbProjekti);
    const hyvaksymisPaatosVaihe = await adaptHyvaksymisPaatosVaiheJulkinen(
      dbProjekti,
      dbProjekti.hyvaksymisPaatosVaiheJulkaisut,
      dbProjekti.kasittelynTila?.hyvaksymispaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu),
      projektiScheduleManager.getHyvaksymisPaatosVaihe(),
      PaatosTyyppi.HYVAKSYMISPAATOS,
      kieli
    );
    const jatkoPaatos1Vaihe = await adaptHyvaksymisPaatosVaiheJulkinen(
      dbProjekti,
      dbProjekti.jatkoPaatos1VaiheJulkaisut,
      dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(julkaisu),
      projektiScheduleManager.getJatkoPaatos1Vaihe(),
      PaatosTyyppi.JATKOPAATOS1,
      kieli
    );
    const jatkoPaatos2Vaihe = await adaptHyvaksymisPaatosVaiheJulkinen(
      dbProjekti,
      dbProjekti.jatkoPaatos2VaiheJulkaisut,
      dbProjekti.kasittelynTila?.toinenJatkopaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(julkaisu),
      projektiScheduleManager.getJatkoPaatos2Vaihe(),
      PaatosTyyppi.JATKOPAATOS2,
      kieli
    );
    const projekti: API.ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      lyhytOsoite: dbProjekti.lyhytOsoite,
      kielitiedot: adaptKielitiedotByAddingTypename(dbProjekti.kielitiedot),
      velho: adaptVelhoJulkinen(dbProjekti.velho),
      euRahoitus: dbProjekti.euRahoitus,
      euRahoitusLogot,
      vahainenMenettely: dbProjekti.vahainenMenettely,
      vuorovaikutukset,
      suunnitteluSopimus,
      aloitusKuulutusJulkaisu,
      paivitetty: dbProjekti.paivitetty,
      projektiHenkilot: Object.values(projektiHenkilot),
      nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    };
    const projektiJulkinen: API.ProjektiJulkinen = removeUndefinedFields(projekti);
    applyProjektiJulkinenStatus(projektiJulkinen);
    if (projektiJulkinen.status && isProjektiJulkinenStatusPublic(projektiJulkinen.status)) {
      return projektiJulkinen;
    } else if (projektiJulkinen.status === Status.EI_JULKAISTU) {
      return {
        __typename: "ProjektiJulkinen",
        oid: dbProjekti.oid,
        velho: { __typename: "VelhoJulkinen" },
        status: projektiJulkinen.status,
      };
    }

    return returnUndefinedForNonPublic ? undefined : projekti;
  }
}

function removeUndefinedFields(object: API.ProjektiJulkinen): API.ProjektiJulkinen {
  return { __typename: "ProjektiJulkinen", oid: object.oid, velho: object.velho, ...pickBy(object, (value) => value !== undefined) };
}

function adaptProjektiHenkilot(
  kayttoOikeudet: DBVaylaUser[],
  suunnitteluSopimuksenKayttajaTunnus: string | undefined
): API.ProjektiKayttajaJulkinen[] {
  return kayttoOikeudet
    ?.filter((kayttoOikeus) => kayttoOikeus.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO || !!kayttoOikeus.yleinenYhteystieto)
    ?.filter((kayttoOikeus) => kayttoOikeus.kayttajatunnus !== suunnitteluSopimuksenKayttajaTunnus)
    ?.map((kayttoOikeus) => adaptProjektiKayttajaJulkinen(kayttoOikeus))
    ?.sort(sortByProjektiPaallikko);
}

function adaptRootSuunnitteluSopimusJulkaisu(dbProjekti: DBProjekti) {
  const yhteysHenkilo = findUserByKayttajatunnus(dbProjekti.kayttoOikeudet, dbProjekti.suunnitteluSopimus?.yhteysHenkilo);
  return adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisuJulkinen(dbProjekti.oid, dbProjekti.suunnitteluSopimus, yhteysHenkilo);
}

type ProjektiKayttajaJulkinenSortFunction = (a: API.ProjektiKayttajaJulkinen, b: API.ProjektiKayttajaJulkinen) => number;
const sortByProjektiPaallikko: ProjektiKayttajaJulkinenSortFunction = (a, b) => {
  // Variable "a" is projektipaallikko and b is not thus "a" is put before "b"
  if (a.projektiPaallikko && !b.projektiPaallikko) {
    return -1;
  }
  // "b" is projektipaallikko and "a" is not thus "b" is put before "a"
  if (!a.projektiPaallikko && b.projektiPaallikko) {
    return 1;
  }
  // "a" and "b" are equal
  return 0;
};

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
