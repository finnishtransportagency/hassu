import { Kieli, KuulutusJulkaisuTila, NykyinenKayttaja, Status, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
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

export const migraatioTilat = ["SUUNNITTELU", "NAHTAVILLAOLO", "HYVAKSYMISPAATOS", "JATKOPAATOS1", "JATKOPAATOS2"] as const;

export type Tila = (typeof migraatioTilat)[number];

export const projektiStatusAfterMigration: Record<Tila, Status> = {
  SUUNNITTELU: Status.SUUNNITTELU,
  NAHTAVILLAOLO: Status.NAHTAVILLAOLO,
  HYVAKSYMISPAATOS: Status.HYVAKSYMISMENETTELYSSA,
  JATKOPAATOS1: Status.EPAAKTIIVINEN_1,
  JATKOPAATOS2: Status.EPAAKTIIVINEN_2,
};

export type ImportProjektiParams = {
  kayttaja: NykyinenKayttaja;
  rivi: Row;
};

export type Row = {
  oid: string;
  tila: Tila;
  hyvaksymispaatosAsianumero?: string;
  hyvaksymispaatosPaivamaara?: Date;
  jatkopaatos1Asianumero?: string;
  jatkopaatos1Paivamaara?: Date;
};

export async function importProjekti(params: ImportProjektiParams): Promise<void> {
  const {
    kayttaja,
    rivi: { oid, tila },
  } = params;
  const { projekti } = await createProjektiFromVelho(oid, kayttaja);
  if (!projekti.velho) {
    throw new Error("Projektille ei saatu ladattua tietoja Projektivelhosta: " + oid);
  }
  const kielitiedot = { ensisijainenKieli: Kieli.SUOMI, toissijainenKieli: null };
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

  const targetStatusRank = statusOrder(projektiStatusAfterMigration[tila]);
  if (targetStatusRank >= statusOrder(Status.SUUNNITTELU)) {
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
  if (targetStatusRank >= statusOrder(Status.NAHTAVILLAOLO)) {
    const vuorovaikutusKierros: VuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MIGROITU,
    };
    await projektiDatabase.saveProjektiWithoutLocking({ oid: projekti.oid, versio, vuorovaikutusKierros });
  }

  if (targetStatusRank >= statusOrder(Status.HYVAKSYMISMENETTELYSSA)) {
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

  if (targetStatusRank >= statusOrder(Status.EPAAKTIIVINEN_1)) {
    const { hyvaksymispaatosAsianumero, hyvaksymispaatosPaivamaara } = params.rivi;
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

  if (targetStatusRank >= statusOrder(Status.EPAAKTIIVINEN_2)) {
    const { jatkopaatos1Asianumero, jatkopaatos1Paivamaara } = params.rivi;
    if (!jatkopaatos1Asianumero || !jatkopaatos1Paivamaara) {
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
      asianumero: jatkopaatos1Asianumero,
      paatoksenPvm: dayjs(jatkopaatos1Paivamaara).format("YYYY-MM-DD"),
      aktiivinen: true,
    };
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      kasittelynTila,
    });
  }
}
