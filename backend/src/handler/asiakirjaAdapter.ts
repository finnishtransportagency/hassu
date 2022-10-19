import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisu,
  Velho,
} from "../database/model";
import cloneDeep from "lodash/cloneDeep";
import { AloitusKuulutusTila, HyvaksymisPaatosVaiheTila, NahtavillaoloVaiheTila } from "../../../common/graphql/apiModel";
import { adaptStandardiYhteystiedotToYhteystiedot } from "../util/adaptStandardiYhteystiedot";
import { findJulkaisuWithTila, findUserByKayttajatunnus } from "../projekti/projektiUtil";
import { adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu } from "../projekti/adapter/adaptToAPI";
import { assertIsDefined } from "../util/assertions";

function createNextAloitusKuulutusJulkaisuID(dbProjekti: DBProjekti) {
  if (!dbProjekti.aloitusKuulutusJulkaisut) {
    return 1;
  }
  return dbProjekti.aloitusKuulutusJulkaisut.length + 1;
}

export class AsiakirjaAdapter {
  adaptAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        id: createNextAloitusKuulutusJulkaisuID(dbProjekti),
        // Tässä vaiheessa kuulutusYhteystiedot on oltava olemassa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot),
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
          dbProjekti.oid,
          dbProjekti.suunnitteluSopimus,
          findUserByKayttajatunnus(dbProjekti.kayttoOikeudet, dbProjekti.suunnitteluSopimus?.yhteysHenkilo)
        ),
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  adaptNahtavillaoloVaiheJulkaisu(dbProjekti: DBProjekti): NahtavillaoloVaiheJulkaisu {
    if (dbProjekti.nahtavillaoloVaihe) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.nahtavillaoloVaihe;
      if (!dbProjekti.kielitiedot) {
        throw new Error("adaptNahtavillaoloVaiheJulkaisu: dbProjekti.kielitiedot puuttuu");
      }
      return {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot),
        // dbProjekti.kielitiedot on oltava olemassa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("NahtavillaoloVaihe puuttuu");
  }

  adaptHyvaksymisPaatosVaiheJulkaisu(
    dbProjekti: DBProjekti,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined
  ): HyvaksymisPaatosVaiheJulkaisu {
    if (hyvaksymisPaatosVaihe) {
      const { kuulutusYhteystiedot, palautusSyy: _palautusSyy, ...includedFields } = hyvaksymisPaatosVaihe;
      return {
        ...includedFields,
        velho: adaptVelho(dbProjekti),
        yhteystiedot: adaptStandardiYhteystiedotToYhteystiedot(dbProjekti, kuulutusYhteystiedot),
        // dbProjekti.kielitiedot on oltava olemassa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        kielitiedot: cloneDeep(dbProjekti.kielitiedot),
      };
    }
    throw new Error("HyvaksymisPaatosVaihe puuttuu");
  }

  migrateAloitusKuulutusJulkaisu(dbProjekti: DBProjekti): AloitusKuulutusJulkaisu {
    if (dbProjekti.aloitusKuulutus) {
      const { palautusSyy: _palautusSyy, ...includedFields } = dbProjekti.aloitusKuulutus;
      return {
        ...includedFields,
        id: createNextAloitusKuulutusJulkaisuID(dbProjekti),
        yhteystiedot: [],
        velho: adaptVelho(dbProjekti),
        suunnitteluSopimus: null,
      };
    }
    throw new Error("Aloituskuulutus puuttuu");
  }

  findAloitusKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findNahtavillaoloWaitingForApproval(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    if (projekti.nahtavillaoloVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findHyvaksymisPaatosVaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findJatkoPaatos1VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.jatkoPaatos1VaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.jatkoPaatos1VaiheJulkaisut, HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findJatkoPaatos2VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    if (projekti.jatkoPaatos2VaiheJulkaisut) {
      return findJulkaisuWithTila(projekti.jatkoPaatos2VaiheJulkaisut, HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA);
    }
  }

  findAloitusKuulutusLastApproved(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    if (projekti.aloitusKuulutusJulkaisut) {
      return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.HYVAKSYTTY);
    }
  }
}

function adaptVelho(dbProjekti: DBProjekti): Velho {
  assertIsDefined(dbProjekti.velho);
  return cloneDeep(dbProjekti.velho);
}

export const asiakirjaAdapter = new AsiakirjaAdapter();
