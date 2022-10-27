import {
  AloitusKuulutusTila,
  HyvaksymisPaatosVaiheTila,
  Kieli,
  NahtavillaoloVaiheTila,
  NykyinenKayttaja,
  Status,
  SuunnitteluVaiheTila,
} from "../../../common/graphql/apiModel";
import { createProjektiFromVelho } from "../projekti/projektiHandler";
import { log } from "../logger";
import { projektiDatabase } from "../database/projektiDatabase";
import { statusOrder } from "../../../common/statusOrder";
import { AloitusKuulutusJulkaisu, HyvaksymisPaatosVaiheJulkaisu, NahtavillaoloVaiheJulkaisu, SuunnitteluVaihe } from "../database/model";
import { cloneDeep } from "lodash";
import dayjs from "dayjs";

export type TargetStatuses = typeof Status["SUUNNITTELU" | "NAHTAVILLAOLO" | "HYVAKSYMISMENETTELYSSA" | "EPAAKTIIVINEN_1"];
export type ImportProjektiParams = {
  oid: string;
  kayttaja: NykyinenKayttaja;
  targetStatus: TargetStatuses;
  hyvaksymispaatosAsianumero?: string;
  hyvaksymispaatosPaivamaara?: Date;
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
  await projektiDatabase.createProjekti(projekti);
  log.info("Created projekti to Hassu");

  const targetStatusRank = statusOrder[targetStatus];
  if (targetStatusRank >= statusOrder[Status.SUUNNITTELU]) {
    const aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu = {
      kielitiedot,
      id: 1,
      tila: AloitusKuulutusTila.MIGROITU,
      yhteystiedot: [],
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.aloitusKuulutusJulkaisut.insert(projekti.oid, aloitusKuulutusJulkaisu);
  }

  if (targetStatusRank >= statusOrder[Status.NAHTAVILLAOLO]) {
    const suunnitteluVaihe: SuunnitteluVaihe = {
      tila: SuunnitteluVaiheTila.MIGROITU,
    };
    await projektiDatabase.saveProjekti({ oid: projekti.oid, suunnitteluVaihe });
  }

  if (targetStatusRank >= statusOrder[Status.HYVAKSYMISMENETTELYSSA]) {
    const nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu = {
      kielitiedot,
      id: 1,
      tila: NahtavillaoloVaiheTila.MIGROITU,
      yhteystiedot: [],
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.insert(projekti.oid, nahtavillaoloVaiheJulkaisu);
  }

  if (targetStatusRank >= statusOrder[Status.EPAAKTIIVINEN_1]) {
    const { hyvaksymispaatosAsianumero, hyvaksymispaatosPaivamaara } = params;
    if (!hyvaksymispaatosAsianumero || !hyvaksymispaatosPaivamaara) {
      log.error("Hyväksymispäätös puuttuu!", { oid });
    }
    const hyvaksymisPaatosVaiheJulkaisu: HyvaksymisPaatosVaiheJulkaisu = {
      kielitiedot,
      id: 1,
      tila: HyvaksymisPaatosVaiheTila.MIGROITU,
      yhteystiedot: [],
      velho: cloneDeep(projekti.velho),
      muokkaaja: kayttaja.uid,
    };
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.insert(projekti.oid, hyvaksymisPaatosVaiheJulkaisu);
    await projektiDatabase.saveProjekti({
      oid,
      kasittelynTila: {
        hyvaksymispaatos: {
          asianumero: hyvaksymispaatosAsianumero,
          paatoksenPvm: dayjs(hyvaksymispaatosPaivamaara).format("YYYY-MM-DD"),
          aktiivinen: true,
        },
      },
    });
  }
}
