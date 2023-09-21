import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  DBVaylaUser,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisu,
  SuunnitteluSopimus,
  SuunnitteluSopimusJulkaisu,
  Velho,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import cloneDeep from "lodash/cloneDeep";
import { KuulutusJulkaisuTila, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import {
  adaptStandardiYhteystiedotToIncludePakotukset,
  adaptStandardiYhteystiedotToYhteystiedot,
} from "../util/adaptStandardiYhteystiedot";
import { findJulkaisuWithTila, findUserByKayttajatunnus } from "../projekti/projektiUtil";
import { assertIsDefined } from "../util/assertions";
import { uuid } from "../util/uuid";
import { parameters } from "../aws/parameters";

function createNextAloitusKuulutusJulkaisuID(dbProjekti: DBProjekti) {
  if (!dbProjekti.aloitusKuulutusJulkaisut) {
    return 1;
  }
  return dbProjekti.aloitusKuulutusJulkaisut.length + 1;
}

export class AsiakirjaAdapter {
  async adaptAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): Promise<AloitusKuulutusJulkaisu> {
    if (dbProjekti.aloitusKuulutus) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      const julkaisu: AloitusKuulutusJulkaisu = {
        ...includedFields,
        id: createNextAloitusKuulutusJulkaisuID(dbProjekti),
        kuulutusYhteystiedot: adaptStandardiYhteystiedotToIncludePakotukset(dbProjekti, kuulutusYhteystiedot, true, true),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot, true, true),
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: this.adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
          dbProjekti.suunnitteluSopimus,
          findUserByKayttajatunnus(dbProjekti.kayttoOikeudet, dbProjekti.suunnitteluSopimus?.yhteysHenkilo)
        ),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
      if (await parameters.isAsianhallintaIntegrationEnabled()) {
        julkaisu.asianhallintaEventId = uuid.v4();
      }
      return julkaisu;
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  private adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
    suunnitteluSopimus: SuunnitteluSopimus | null | undefined,
    yhteysHenkilo: DBVaylaUser | undefined
  ): SuunnitteluSopimusJulkaisu | undefined | null {
    if (suunnitteluSopimus) {
      if (!suunnitteluSopimus.logo) {
        throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
      }

      return {
        kunta: suunnitteluSopimus.kunta,
        logo: suunnitteluSopimus.logo,
        etunimi: yhteysHenkilo?.etunimi || "",
        sukunimi: yhteysHenkilo?.sukunimi || "",
        email: yhteysHenkilo?.email || "",
        puhelinnumero: yhteysHenkilo?.puhelinnumero || "",
      };
    }
    return suunnitteluSopimus;
  }

  async adaptVuorovaikutusKierrosJulkaisu(dbProjekti: DBProjekti): Promise<VuorovaikutusKierrosJulkaisu> {
    if (dbProjekti.vuorovaikutusKierros) {
      const { vuorovaikutusTilaisuudet, esitettavatYhteystiedot, vuorovaikutusNumero, ...includedFields } = dbProjekti.vuorovaikutusKierros;
      const julkaisu: VuorovaikutusKierrosJulkaisu = {
        ...includedFields,
        id: vuorovaikutusNumero,
        vuorovaikutusTilaisuudet: vuorovaikutusTilaisuudet?.map((tilaisuus) =>
          this.adaptVuorovaikutusTilaisuusJulkaisuksi(dbProjekti, tilaisuus)
        ),
        esitettavatYhteystiedot: adaptStandardiYhteystiedotToIncludePakotukset(dbProjekti, esitettavatYhteystiedot, true, true),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, esitettavatYhteystiedot, true, true), // pakotetaan kunnan edustaja tai projari
        tila: VuorovaikutusKierrosTila.JULKINEN,
      };
      if (await parameters.isAsianhallintaIntegrationEnabled()) {
        julkaisu.asianhallintaEventId = uuid.v4();
      }
      return julkaisu;
    }
    throw new Error("VuorovaikutusKierros puuttuu");
  }

  private adaptVuorovaikutusTilaisuusJulkaisuksi(
    projekti: DBProjekti,
    vuorovaikutusTilaisuus: VuorovaikutusTilaisuus
  ): VuorovaikutusTilaisuusJulkaisu {
    const tilaisuusKopio = { ...vuorovaikutusTilaisuus };
    const esitettavatYhteystiedotKopio = tilaisuusKopio.esitettavatYhteystiedot;
    delete tilaisuusKopio.esitettavatYhteystiedot;
    return {
      ...tilaisuusKopio,
      esitettavatYhteystiedot: adaptStandardiYhteystiedotToIncludePakotukset(projekti, esitettavatYhteystiedotKopio, true, true),
      yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(projekti, esitettavatYhteystiedotKopio),
    };
  }

  async adaptNahtavillaoloVaiheJulkaisu(dbProjekti: DBProjekti): Promise<NahtavillaoloVaiheJulkaisu> {
    if (dbProjekti.nahtavillaoloVaihe) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.nahtavillaoloVaihe;
      assertIsDefined(dbProjekti.kielitiedot);
      const julkaisu: NahtavillaoloVaiheJulkaisu = {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        kuulutusYhteystiedot: adaptStandardiYhteystiedotToIncludePakotukset(dbProjekti, kuulutusYhteystiedot, true, true),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot, true, false), // dbProjekti.kielitiedot on oltava olemassa
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
      if (await parameters.isAsianhallintaIntegrationEnabled()) {
        julkaisu.asianhallintaEventId = uuid.v4();
      }
      return julkaisu;
    }
    throw new Error("NahtavillaoloVaihe puuttuu");
  }

  async adaptHyvaksymisPaatosVaiheJulkaisu(
    dbProjekti: DBProjekti,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined
  ): Promise<HyvaksymisPaatosVaiheJulkaisu> {
    if (hyvaksymisPaatosVaihe) {
      assertIsDefined(dbProjekti.kielitiedot);
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = hyvaksymisPaatosVaihe;
      const julkaisu: HyvaksymisPaatosVaiheJulkaisu = {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        kuulutusYhteystiedot: adaptStandardiYhteystiedotToIncludePakotukset(dbProjekti, kuulutusYhteystiedot, true, true),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot, true, false), // dbProjekti.kielitiedot on oltava olemassa
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
      if (await parameters.isAsianhallintaIntegrationEnabled()) {
        julkaisu.asianhallintaEventId = uuid.v4();
      }
      return julkaisu;
    }
    throw new Error("HyvaksymisPaatosVaihe puuttuu");
  }

  findAloitusKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findNahtavillaoloWaitingForApproval(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    if (projekti.nahtavillaoloVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findHyvaksymisPaatosVaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findJatkoPaatos1VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.jatkoPaatos1VaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.jatkoPaatos1VaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findJatkoPaatos2VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.jatkoPaatos2VaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.jatkoPaatos2VaiheJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findAloitusKuulutusLastApproved(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    }
  }

  findHyvaksymisKuulutusLastApproved(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    }
  }

  findNahtavillaoloLastApproved(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    if (projekti.nahtavillaoloVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    }
  }
}

function adaptVelho(dbProjekti: DBProjekti): Velho {
  assertIsDefined(dbProjekti.velho);
  return cloneDeep(dbProjekti.velho);
}

export const asiakirjaAdapter = new AsiakirjaAdapter();
