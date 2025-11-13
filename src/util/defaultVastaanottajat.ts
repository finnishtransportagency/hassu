import {
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  IlmoituksenVastaanottajatInput,
  Kieli,
  KirjaamoOsoite,
  KuntaVastaanottajaInput,
  Projekti,
  ViranomaisVastaanottajaInput,
  Status,
  MaakuntaVastaanottajaInput,
} from "@services/api";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { isEvkAktivoitu } from "common/util/isEvkAktivoitu";
import { kuntametadata } from "hassu-common/kuntametadata";
import uniqBy from "lodash/uniqBy";

function findPreviousPhaseRecipients(projekti?: Projekti | null): IlmoituksenVastaanottajat | null | undefined {
  switch (projekti?.status) {
    case Status.SUUNNITTELU: {
      const julkaisut = projekti.vuorovaikutusKierrosJulkaisut ?? [];
      if (!julkaisut.length) return projekti.aloitusKuulutus?.ilmoituksenVastaanottajat;

      const maxJulkaisu = julkaisut.reduce((a, b) => (a.id > b.id ? a : b));
      const currentKierros = projekti.vuorovaikutusKierros;

      if (currentKierros && currentKierros.vuorovaikutusNumero > maxJulkaisu.id) {
        return maxJulkaisu.ilmoituksenVastaanottajat;
      }
      return projekti.aloitusKuulutus?.ilmoituksenVastaanottajat;
    }

    case Status.NAHTAVILLAOLO:
      return projekti.vuorovaikutusKierros?.ilmoituksenVastaanottajat ?? projekti.aloitusKuulutus?.ilmoituksenVastaanottajat;
    case Status.HYVAKSYTTY:
    case Status.HYVAKSYMISMENETTELYSSA:
    case Status.HYVAKSYMISMENETTELYSSA_AINEISTOT:
      return projekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat;
    case Status.JATKOPAATOS_1:
      return projekti.hyvaksymisPaatosVaihe?.ilmoituksenVastaanottajat;
    case Status.JATKOPAATOS_2:
      return projekti.jatkoPaatos1Vaihe?.ilmoituksenVastaanottajat;
    default:
      return null;
  }
}

// Build municipality recipients
function buildKuntaRecipients(
  projekti?: Projekti | null,
  existing?: IlmoituksenVastaanottajat | null
): KuntaVastaanottajaInput[] {
  const kunnatMap = new Map(existing?.kunnat?.map((k) => [k.id, k.sahkoposti]));
  return (
    projekti?.velho?.kunnat?.map((id) => ({
      id,
      sahkoposti: kunnatMap?.get(id) ?? "",
    })) ?? []
  );
}

// Build region recipients (for jatkopäätös)
function buildMaakuntaRecipients(
  projekti?: Projekti | null,
  existing?: IlmoituksenVastaanottajat | null
): MaakuntaVastaanottajaInput[] {
  const maakunnatMap = new Map(existing?.maakunnat?.map((m) => [m.id, m.sahkoposti]));
  return (
    projekti?.velho?.maakunnat?.map((id) => ({
      id,
      sahkoposti: maakunnatMap?.get(id) ?? "",
    })) ?? []
  );
}

// Build authority recipients
function buildViranomaisetRecipients(
  projekti?: Projekti | null,
  current?: IlmoituksenVastaanottajat | null,
  previous?: IlmoituksenVastaanottajat | null,
  kirjaamot?: KirjaamoOsoite[]
): ViranomaisVastaanottajaInput[] {
  // Case 1: Form already has data
  if (current?.viranomaiset) {
    return current.viranomaiset.map((v) => ({ nimi: v.nimi, sahkoposti: v.sahkoposti }));
  }

  // Case 2: Use previous phase data
  if (previous?.viranomaiset) {
    return previous.viranomaiset.map((v) => ({ nimi: v.nimi, sahkoposti: v.sahkoposti }));
  }

  // Case 3: Initialize from scratch
  const vayla = kirjaamot?.find((o) => o.nimi === "VAYLAVIRASTO");
  const vastuu = projekti?.velho?.suunnittelustaVastaavaViranomainen;

  // If Väylä is NOT the responsible authority, add ELYs / kunnat
  if (vastuu !== "VAYLAVIRASTO") {
    const isEvk = isEvkAktivoitu()
    const viranomaiset =
      projekti?.velho?.kunnat?.map((kuntaId) => {
        const ely = isEvk ? kuntametadata.viranomainenForKuntaId(kuntaId) : kuntametadata.elyViranomainenForKuntaId(kuntaId);
        const osoite = kirjaamot?.find((o) => o.nimi === ely);
        return osoite
          ? { nimi: osoite.nimi, sahkoposti: osoite.sahkoposti }
          : { nimi: kuntametadata.nameForKuntaId(kuntaId, Kieli.SUOMI) as IlmoitettavaViranomainen, sahkoposti: "" };
      }) ?? [];

    return uniqBy(viranomaiset, (v) => v.nimi);
  }

  // Väylä is responsible → just return Väylä address
  return [
    vayla
      ? { nimi: vayla.nimi, sahkoposti: vayla.sahkoposti }
      : { nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "" },
  ];
}

export default function defaultVastaanottajat(
  projekti: Projekti | null | undefined,
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined,
  kirjaamoOsoitteet: KirjaamoOsoite[] | undefined,
  paatosTyyppi?: PaatosTyyppi | null
): IlmoituksenVastaanottajatInput {
  const previous = findPreviousPhaseRecipients(projekti);

  const kunnat = buildKuntaRecipients(projekti, ilmoituksenVastaanottajat ?? previous);
  const maakunnat =
    paatosTyyppi === PaatosTyyppi.JATKOPAATOS1 || paatosTyyppi === PaatosTyyppi.JATKOPAATOS2
      ? buildMaakuntaRecipients(projekti, ilmoituksenVastaanottajat)
      : [];

  const viranomaiset = buildViranomaisetRecipients(
    projekti,
    ilmoituksenVastaanottajat,
    previous,
    kirjaamoOsoitteet
  );

  return { kunnat, viranomaiset, maakunnat };
}
