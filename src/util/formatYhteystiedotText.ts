import { Yhteystieto } from "../../common/graphql/apiModel";

export default function formatYhteystiedotText(yhteystiedot: Yhteystieto[]): string {
  const yhteystiedotList = yhteystiedot.map(
    (yt) => yt.etunimi + " " + yt.sukunimi + ", puh. " + yt.puhelinnumero + ", " + yt.sahkoposti + " (" + yt.organisaatio + ")"
  );

  if (yhteystiedotList.length == 1) {
    return yhteystiedotList[0];
  } else {
    return yhteystiedotList.slice(0, yhteystiedotList.length - 1).join(", ") + " ja " + yhteystiedotList[yhteystiedotList.length - 1];
  }
}
