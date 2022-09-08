import { ProjektiHakutulosJulkinen, Status } from "@services/api";
import { ProjektinTila, Suunnitelmatyyppi, OtsikkoLinkki, HakutulosListaItem, HakutulosLista, Kuvaus } from "./TyylitellytKomponentit";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "../../util/dateUtils";

type Props = {
  hakutulos: ProjektiHakutulosJulkinen | undefined;
  ladataan: boolean | undefined | null;
};



function getSivuTilanPerusteella(tila: Status | null | undefined) {
  if (!tila) {
    return "";
  }
  switch (tila) {
    case Status.ALOITUSKUULUTUS:
      return "aloituskuulutus";
    case Status.SUUNNITTELU:
        return "suunnitteluvaihe";
    case Status.NAHTAVILLAOLO:
      return "nahtavillaolo";
    case Status.HYVAKSYMISMENETTELYSSA:
      return "hyvaksymismenettelyssa";
    case Status.HYVAKSYTTY:
      return ""; //todo
    case Status.LAINVOIMA:
      return "lainvoima";
    default:
      return "";
  }
}

export default function Hakutulokset({ hakutulos, ladataan }: Props) {

  const { t } = useTranslation();

  if (!hakutulos && ladataan) {
    return <>Ladataan...</>;
  }

  return (
    <HakutulosLista className="Hakutulokset">
      {hakutulos?.tulokset?.map((tulos) => {

        return (
          <HakutulosListaItem key={tulos.oid}>
            <OtsikkoLinkki href={`suunnitelma/${tulos.oid}/${getSivuTilanPerusteella(tulos.vaihe)}`}>{tulos.nimi}</OtsikkoLinkki>
            <Suunnitelmatyyppi>{t(`projekti:projekti-tyyppi.${tulos.projektiTyyppi}`)}</Suunnitelmatyyppi>
            <ProjektinTila>{t(`projekti:projekti-status.${tulos.vaihe}`)}</ProjektinTila>
            <Kuvaus>{tulos.hankkeenKuvaus}</Kuvaus>
            {t("projekti:ui-otsikot.paivitetty")}{" "}{formatDate(tulos.paivitetty)}
          </HakutulosListaItem>
        ); 
      })}
    </HakutulosLista>
  );
}


