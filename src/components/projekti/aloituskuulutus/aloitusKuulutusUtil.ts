import { AloitusKuulutusJulkaisu } from "../../../../common/graphql/apiModel";
import dayjs from "dayjs";

export function examineKuulutusPaiva(aloituskuulutusjulkaisu: AloitusKuulutusJulkaisu) {
  let kuulutusPaiva: string | undefined;
  let published: boolean;
  const date = aloituskuulutusjulkaisu?.kuulutusPaiva;
  if (date) {
    let parsedDate = dayjs(date);
    if (date.length == 10) {
      kuulutusPaiva = parsedDate.format("DD.MM.YYYY");
    } else {
      kuulutusPaiva = parsedDate.format("DD.MM.YYYY HH:mm");
    }
    published = parsedDate.isBefore(dayjs());
  } else {
    published = false;
    kuulutusPaiva = undefined;
  }
  return { kuulutusPaiva, published };
}
