import dayjs from "dayjs";
import { SahkopostiVastaanottaja } from "../../common/graphql/apiModel";

export function examineKuulutusPaiva(givenKuulutusPaiva: string | null | undefined) {
  let published: boolean;
  let kuulutusPaiva: string | undefined;
  const date = givenKuulutusPaiva;
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

export function lahetysTila(vastaanottaja: Pick<SahkopostiVastaanottaja, "lahetysvirhe" | "lahetetty">) {
  if (vastaanottaja.lahetysvirhe) {
    return "Lähetysvirhe";
  }
  return vastaanottaja.lahetetty ? "Lähetetty" : "Ei lähetetty";
}
