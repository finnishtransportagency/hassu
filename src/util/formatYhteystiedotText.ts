import { Yhteystieto } from "../../common/graphql/apiModel";
import { formatNimi } from "./userUtil";

export default function formatYhteystiedotText(yhteystiedot: Yhteystieto[]): string {
  const yhteystiedotList = yhteystiedot.map(
    (yt) => formatNimi(yt) + ", puh. " + yt.puhelinnumero + ", " + yt.sahkoposti + " (" + yt.organisaatio + ")"
  );

  if (yhteystiedotList.length == 1) {
    return yhteystiedotList[0];
  } else {
    return yhteystiedotList.slice(0, yhteystiedotList.length - 1).join(", ") + " ja " + yhteystiedotList[yhteystiedotList.length - 1];
  }
}
