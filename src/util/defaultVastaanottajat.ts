import {
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  IlmoituksenVastaanottajatInput,
  Kieli,
  KirjaamoOsoite,
  KuntaVastaanottajaInput,
  Projekti,
  ViranomaisVastaanottajaInput,
} from "@services/api";
import { kuntametadata } from "../../common/kuntametadata";

export default function defaultVastaanottajat(
  projekti: Projekti | null | undefined,
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined,
  kirjaamoOsoitteet: KirjaamoOsoite[] | undefined
): IlmoituksenVastaanottajatInput {
  let kunnat: KuntaVastaanottajaInput[];
  let viranomaiset: ViranomaisVastaanottajaInput[];
  if (ilmoituksenVastaanottajat?.kunnat) {
    // tapaus, jossa lomake on jo kerran tallennettu
    kunnat = ilmoituksenVastaanottajat?.kunnat.map((kunta) => ({
      id: kunta.id,
      sahkoposti: kunta.sahkoposti,
    }));
  } else {
    // tapaus, jossa lomake alustetaan ensimmäistä kertaa
    kunnat =
      projekti?.velho?.kunnat?.map((kuntaId) => ({
        id: kuntaId,
        sahkoposti: "",
      })) || [];
  }
  if (ilmoituksenVastaanottajat?.viranomaiset) {
    // tapaus, jossa lomake on jo kerran tallennettu
    viranomaiset = ilmoituksenVastaanottajat?.viranomaiset.map((viranomainen) => ({
      nimi: viranomainen.nimi,
      sahkoposti: viranomainen.sahkoposti,
    }));
  } else {
    // tapaus, jossa lomake alustetaan ensimmäistä kertaa
    const vaylavirastoKirjaamo = kirjaamoOsoitteet?.find((osoite) => osoite.nimi == "VAYLAVIRASTO");
    viranomaiset =
      projekti?.velho?.suunnittelustaVastaavaViranomainen === "VAYLAVIRASTO"
        ? projekti?.velho?.maakunnat?.map((maakunta) => {
            const ely: IlmoitettavaViranomainen = kuntametadata.viranomainenForMaakuntaId(maakunta);
            const kirjaamoOsoite = kirjaamoOsoitteet?.find((osoite) => osoite.nimi == ely);
            if (kirjaamoOsoite) {
              return { nimi: kirjaamoOsoite.nimi, sahkoposti: kirjaamoOsoite.sahkoposti };
            } else {
              return { nimi: kuntametadata.nameForMaakuntaId(maakunta, Kieli.SUOMI), sahkoposti: "" } as ViranomaisVastaanottajaInput;
            }
          }) || []
        : [
            vaylavirastoKirjaamo
              ? { nimi: vaylavirastoKirjaamo.nimi, sahkoposti: vaylavirastoKirjaamo.sahkoposti }
              : ({ nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "" } as ViranomaisVastaanottajaInput),
          ];
  }
  return {
    kunnat,
    viranomaiset,
  };
}
