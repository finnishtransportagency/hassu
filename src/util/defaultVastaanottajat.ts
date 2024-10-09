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
import { kuntametadata } from "hassu-common/kuntametadata";
import uniqBy from "lodash/uniqBy";

function findOutEdellisenVaiheenIlmoituksenVastaanottajat(
  projekti: Projekti | null | undefined
): IlmoituksenVastaanottajat | null | undefined {
  switch (projekti?.status) {
    case Status.SUUNNITTELU: {
      if (projekti.vuorovaikutusKierrosJulkaisut?.length) {
        const maxKierrosId = Math.max(...projekti.vuorovaikutusKierrosJulkaisut.map((julkaisu) => julkaisu.id));
        const maxIdJulkaisu = projekti.vuorovaikutusKierrosJulkaisut.find((julkaisu) => julkaisu.id == maxKierrosId);
        if (projekti.vuorovaikutusKierros && projekti.vuorovaikutusKierros.vuorovaikutusNumero > maxKierrosId) {
          return maxIdJulkaisu?.ilmoituksenVastaanottajat;
        }
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
  }

  return null;
}

export default function defaultVastaanottajat(
  projekti: Projekti | null | undefined,
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined,
  kirjaamoOsoitteet: KirjaamoOsoite[] | undefined,
  paatosTyyppi?: PaatosTyyppi | null
): IlmoituksenVastaanottajatInput {
  let kunnat: KuntaVastaanottajaInput[];
  let viranomaiset: ViranomaisVastaanottajaInput[];
  let maakunnat: MaakuntaVastaanottajaInput[];
  const edellisenVaiheenilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined =
    findOutEdellisenVaiheenIlmoituksenVastaanottajat(projekti);
  const kunnatMap = new Map<number, string>();
  ilmoituksenVastaanottajat?.kunnat?.forEach((kunta) => kunnatMap.set(kunta.id, kunta.sahkoposti));
  kunnat =
    projekti?.velho?.kunnat?.map((kuntaId) => ({
      id: kuntaId,
      sahkoposti: kunnatMap.get(kuntaId) ?? "",
    })) || [];
  if (paatosTyyppi === PaatosTyyppi.JATKOPAATOS1 || paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
    const maakunnatMap = new Map<number, string>();
    ilmoituksenVastaanottajat?.maakunnat?.forEach((maakunta) => maakunnatMap.set(maakunta.id, maakunta.sahkoposti));
    maakunnat =
      projekti?.velho?.maakunnat?.map((id) => ({
        id,
        sahkoposti: maakunnatMap.get(id) ?? "",
      })) || [];
  } else {
    maakunnat = [];
  }
  if (ilmoituksenVastaanottajat?.viranomaiset) {
    // tapaus, jossa lomake on jo kerran tallennettu
    viranomaiset = ilmoituksenVastaanottajat?.viranomaiset.map((viranomainen) => ({
      nimi: viranomainen.nimi,
      sahkoposti: viranomainen.sahkoposti,
    }));
  } else if (edellisenVaiheenilmoituksenVastaanottajat?.viranomaiset) {
    //tapaus, jossa edellisessä vaiheessa on syötetty viranomaiset; ne halutaan nykyisen vaiheen default-arvoksi
    viranomaiset = edellisenVaiheenilmoituksenVastaanottajat?.viranomaiset.map((viranomainen) => ({
      nimi: viranomainen.nimi,
      sahkoposti: viranomainen.sahkoposti,
    }));
  } else {
    // tapaus, jossa lomake alustetaan ensimmäistä kertaa
    const vaylavirastoKirjaamo = kirjaamoOsoitteet?.find((osoite) => osoite.nimi == "VAYLAVIRASTO");
    if (projekti?.velho?.suunnittelustaVastaavaViranomainen !== "VAYLAVIRASTO") {
      viranomaiset =
        projekti?.velho?.kunnat?.map((kuntaId) => {
          const ely: IlmoitettavaViranomainen = kuntametadata.viranomainenForKuntaId(kuntaId);
          const kirjaamoOsoite = kirjaamoOsoitteet?.find((osoite) => osoite.nimi == ely);
          if (kirjaamoOsoite) {
            return { nimi: kirjaamoOsoite.nimi, sahkoposti: kirjaamoOsoite.sahkoposti };
          } else {
            return { nimi: kuntametadata.nameForKuntaId(kuntaId, Kieli.SUOMI), sahkoposti: "" } as ViranomaisVastaanottajaInput;
          }
        }) || [];
      viranomaiset = uniqBy(viranomaiset, (v) => v.nimi);
    } else {
      viranomaiset = [
        vaylavirastoKirjaamo
          ? { nimi: vaylavirastoKirjaamo.nimi, sahkoposti: vaylavirastoKirjaamo.sahkoposti }
          : ({ nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "" } as ViranomaisVastaanottajaInput),
      ];
    }
  }
  return {
    kunnat,
    viranomaiset,
    maakunnat,
  };
}
