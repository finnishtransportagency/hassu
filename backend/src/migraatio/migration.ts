import {
  Kieli,
  KuulutusJulkaisuTila as KuulutusJulkaisuTila,
  NykyinenKayttaja,
  Status,
  VuorovaikutusKierrosTila,
} from "hassu-common/graphql/apiModel";
import { createProjektiFromVelho } from "../projekti/projektiHandler";
import { log } from "../logger";
import { projektiDatabase } from "../database/projektiDatabase";
import { statusOrder } from "hassu-common/statusOrder";
import {
  AloitusKuulutusJulkaisu,
  KasittelynTila,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisu,
  VuorovaikutusKierros,
} from "../database/model";
import { cloneDeep } from "lodash";
import dayjs from "dayjs";

export type TargetStatuses = (typeof Status)["SUUNNITTELU" | "NAHTAVILLAOLO" | "HYVAKSYMISMENETTELYSSA" | "EPAAKTIIVINEN_1"];
export type ImportProjektiParams = {
  oid: string;
  kayttaja: NykyinenKayttaja;
  targetStatus: TargetStatuses;
  hyvaksymispaatosAsianumero?: string;
  hyvaksymispaatosPaivamaara?: Date;
  jatkopaatosAsianumero?: string;
  jatkopaatosPaivamaara?: Date;
};

export async function importProjekti(params: ImportProjektiParams): Promise<void> {
  const { oid, kayttaja, targetStatus } = params;
  const { projekti } = await createProjektiFromVelho(oid, kayttaja);
  if (!projekti.velho) {
    throw new Error("Projektille ei saatu ladattua tietoja Projektivelhosta: " + oid);
  }
  const kielitiedot = { ensisijainenKieli: Kieli.SUOMI };
  projekti.kielitiedot = kielitiedot;
  projekti.euRahoitus = false; // TODO selvitä mikä on sopiva oletusarvo vai haetaanko excelistä

  log.info("Creating projekti to Hassu", { projekti });
  const isInTest = typeof (global as unknown as Record<string, unknown>).it === "function";
  if (isInTest) {
    // Jos ajetaan mocha-testeissä, niin nollataan käsittelyn tila
    projekti.kasittelynTila = null;
  }
  await projektiDatabase.createProjekti(projekti);
  log.info("Created projekti to Hassu");

  const targetStatusRank = statusOrder[targetStatus];
  if (targetStatusRank >= statusOrder[Status.SUUNNITTELU]) {
    const aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu = {
      kielitiedot,
      id: 1,
      tila: KuulutusJulkaisuTila.MIGROITU,
      yhteystiedot: [],
      kuulutusYhteystiedot: {},
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.aloitusKuulutusJulkaisut.insert(projekti.oid, aloitusKuulutusJulkaisu);
  }

  const versio = projekti.versio;
  if (targetStatusRank >= statusOrder[Status.NAHTAVILLAOLO]) {
    const vuorovaikutusKierros: VuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MIGROITU,
    };
    await projektiDatabase.saveProjektiWithoutLocking({ oid: projekti.oid, versio, vuorovaikutusKierros });
  }

  if (targetStatusRank >= statusOrder[Status.HYVAKSYMISMENETTELYSSA]) {
    const nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu = {
      kielitiedot,
      id: 1,
      tila: KuulutusJulkaisuTila.MIGROITU,
      yhteystiedot: [],
      kuulutusYhteystiedot: {},
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.insert(projekti.oid, nahtavillaoloVaiheJulkaisu);
  }

  const kasittelynTila: KasittelynTila = {
    ...projekti.kasittelynTila,
  };

  if (targetStatusRank >= statusOrder[Status.EPAAKTIIVINEN_1]) {
    const { hyvaksymispaatosAsianumero, hyvaksymispaatosPaivamaara } = params;
    if (!hyvaksymispaatosAsianumero || !hyvaksymispaatosPaivamaara) {
      log.error("Hyväksymispäätös puuttuu!", { oid });
    }
    const hyvaksymisPaatosVaiheJulkaisu: HyvaksymisPaatosVaiheJulkaisu = {
      kielitiedot,
      id: 1,
      tila: KuulutusJulkaisuTila.MIGROITU,
      yhteystiedot: [],
      kuulutusYhteystiedot: {},
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.insert(projekti.oid, hyvaksymisPaatosVaiheJulkaisu);
    kasittelynTila.hyvaksymispaatos = {
      asianumero: hyvaksymispaatosAsianumero,
      paatoksenPvm: dayjs(hyvaksymispaatosPaivamaara).format("YYYY-MM-DD"),
      aktiivinen: true,
    };
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      kasittelynTila,
    });
  }

  if (targetStatusRank >= statusOrder[Status.EPAAKTIIVINEN_2]) {
    const { jatkopaatosAsianumero, jatkopaatosPaivamaara } = params;
    if (!jatkopaatosAsianumero || !jatkopaatosPaivamaara) {
      log.error("Jatkopäätös puuttuu!", { oid });
    }
    const jatkoPaatosVaiheJulkaisu: HyvaksymisPaatosVaiheJulkaisu = {
      kielitiedot,
      id: 1,
      tila: KuulutusJulkaisuTila.MIGROITU,
      yhteystiedot: [],
      kuulutusYhteystiedot: {},
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.insert(projekti.oid, jatkoPaatosVaiheJulkaisu);
    kasittelynTila.ensimmainenJatkopaatos = {
      asianumero: jatkopaatosAsianumero,
      paatoksenPvm: dayjs(jatkopaatosPaivamaara).format("YYYY-MM-DD"),
      aktiivinen: true,
    };
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      kasittelynTila,
    });
  }
}
