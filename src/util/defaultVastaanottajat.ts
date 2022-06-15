import {
  IlmoitettavaViranomainen,
  KuntaVastaanottajaInput,
  ViranomaisVastaanottajaInput,
  Projekti,
  IlmoituksenVastaanottajatInput,
  IlmoituksenVastaanottajat,
} from "@services/api";
import { removeTypeName } from "./removeTypeName";
import getIlmoitettavaViranomainen from "./getIlmoitettavaViranomainen";

export default function defaultVastaanottajat(
  projekti: Projekti | null | undefined,
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat | null | undefined,
  kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] | null
): IlmoituksenVastaanottajatInput {
  let kunnat: KuntaVastaanottajaInput[];
  let viranomaiset: ViranomaisVastaanottajaInput[];
  if (ilmoituksenVastaanottajat?.kunnat) {
    // tapaus, jossa lomake on jo kerran tallennettu
    kunnat = ilmoituksenVastaanottajat?.kunnat.map((kunta) => {
      kunta = removeTypeName(kunta);
      delete kunta.lahetetty;
      return kunta;
    });
  } else {
    // tapaus, jossa lomake alustetaan ensimmäistä kertaa
    kunnat =
      projekti?.velho?.kunnat?.map((s) => {
        return {
          nimi: s,
          sahkoposti: "",
        } as KuntaVastaanottajaInput;
      }) || [];
  }
  if (ilmoituksenVastaanottajat?.viranomaiset) {
    // tapaus, jossa lomake on jo kerran tallennettu
    viranomaiset = ilmoituksenVastaanottajat?.viranomaiset.map((kunta) => {
      kunta = removeTypeName(kunta);
      delete kunta.lahetetty;
      return kunta;
    });
  } else {
    // tapaus, jossa lomake alustetaan ensimmäistä kertaa
    viranomaiset =
      projekti?.velho?.suunnittelustaVastaavaViranomainen === "VAYLAVIRASTO"
        ? projekti?.velho?.maakunnat?.map((maakunta) => {
            const ely: IlmoitettavaViranomainen = getIlmoitettavaViranomainen(maakunta);
            return (
              kirjaamoOsoitteet?.find((osoite) => osoite.nimi == ely) ||
              ({ nimi: maakunta, sahkoposti: "" } as ViranomaisVastaanottajaInput)
            );
          }) || []
        : [
            kirjaamoOsoitteet?.find((osoite) => osoite.nimi == "VAYLAVIRASTO") ||
              ({ nimi: "VAYLAVIRASTO" as IlmoitettavaViranomainen, sahkoposti: "" } as ViranomaisVastaanottajaInput),
          ];
  }
  return {
    kunnat,
    viranomaiset,
  };
}
