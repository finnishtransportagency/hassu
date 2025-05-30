import { ProjektiHakutulosJulkinen, Status } from "@services/api";
import {
  ProjektinTila,
  Suunnitelmatyyppi,
  OtsikkoLinkki,
  OtsikkoLinkkiMobiili,
  HakutulosListaItem,
  HakutulosLista,
  ProjektinTilaMobiili,
  Kuvaus,
  VuorovaikutusTagi,
} from "./TyylitellytKomponentit";
import useTranslation from "next-translate/useTranslation";
import { formatDate, onTulevaisuudessa, isValidDate } from "hassu-common/util/dateUtils";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { styled } from "@mui/material";
import { H4 } from "@components/Headings";

type Props = {
  hakutulos: ProjektiHakutulosJulkinen | undefined;
  ladataan: boolean | undefined | null;
};

export function getSivuTilanPerusteella(tila: Status | null | undefined) {
  switch (tila) {
    case Status.ALOITUSKUULUTUS:
      return "aloituskuulutus";
    case Status.SUUNNITTELU:
      return "suunnittelu";
    case Status.NAHTAVILLAOLO:
      return "nahtavillaolo";
    case Status.HYVAKSYMISMENETTELYSSA:
      return "hyvaksymismenettelyssa";
    case Status.HYVAKSYTTY:
      return "hyvaksymispaatos";
    case Status.JATKOPAATOS_1:
      return "jatkopaatos1";
    case Status.JATKOPAATOS_2:
      return "jatkopaatos2";
    default:
      return "";
  }
}

export default function Hakutulokset({ hakutulos, ladataan }: Props) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { t } = useTranslation();

  if (!hakutulos && ladataan) {
    return <>{t("common:ladataan")}</>;
  }

  const Img = styled("img")({});

  return (
    <HakutulosLista id="hakutuloslista" className="Hakutulokset">
      {hakutulos?.tulokset?.map((tulos) => {
        const vuorovaikutusTulossa = tulos.vaihe === Status.SUUNNITTELU && onTulevaisuudessa(tulos.viimeinenTilaisuusPaattyy);

        if (desktop) {
          return (
            <HakutulosListaItem key={tulos.oid}>
              <H4>
                <OtsikkoLinkki href={`suunnitelma/${tulos.oid}/${getSivuTilanPerusteella(tulos.vaihe)}`}>{tulos.nimi}</OtsikkoLinkki>
              </H4>
              <Suunnitelmatyyppi>{t(`projekti:projekti-tyyppi.${tulos.projektiTyyppi}`)}</Suunnitelmatyyppi>
              <ProjektinTila>{t(`projekti:projekti-status.${tulos.vaihe}`)}</ProjektinTila>
              {vuorovaikutusTulossa && <VuorovaikutusTagi>{t(`projekti:vuorovaikutus`)}</VuorovaikutusTagi>}
              {tulos.saame && (
                <>
                  <div className="sr-only" id="saamenkielinen_projekti_sr">
                    <span lang="fi-FI">Saamenkielinen</span>
                    <span lang="se-FI">Sámegielat</span>
                  </div>
                  <Img
                    aria-labelledby="saamenkielinen_projekti_sr"
                    src="/assets/saamen_lippu.svg"
                    alt="Saamen lippu"
                    sx={{ maxHeight: "1.84em", paddingBottom: "3px", display: "inline" }}
                  />
                </>
              )}
              <Kuvaus>{tulos.hankkeenKuvaus}</Kuvaus>
              {isValidDate(tulos.viimeisinJulkaisu) && (
                <>
                  {t("projekti:ui-otsikot.julkaistu")} {formatDate(tulos.viimeisinJulkaisu)}
                </>
              )}
            </HakutulosListaItem>
          );
        }

        return (
          <HakutulosListaItem key={tulos.oid}>
            <H4>
              <OtsikkoLinkkiMobiili href={`suunnitelma/${tulos.oid}/${getSivuTilanPerusteella(tulos.vaihe)}`}>
                {tulos.saame && (
                  <>
                    <div className="sr-only" id="saamenkielinen_projekti_sr">
                      <span lang="fi-FI">Saamenkielinen</span>
                      <span lang="se-FI">Sámegielat</span>
                    </div>
                    <Img
                      aria-labelledby="saamenkielinen_projekti_sr"
                      src="/assets/saamen_lippu.svg"
                      alt="Saamen lippu"
                      sx={{ maxHeight: "1.75em", float: "right" }}
                    />
                  </>
                )}
                {tulos.nimi}
              </OtsikkoLinkkiMobiili>
            </H4>
            <ProjektinTilaMobiili>{t(`projekti:projekti-status.${tulos.vaihe}`)}</ProjektinTilaMobiili>
            {isValidDate(tulos.viimeisinJulkaisu) && (
              <>
                {t("projekti:ui-otsikot.julkaistu")} {formatDate(tulos.viimeisinJulkaisu)}
              </>
            )}
          </HakutulosListaItem>
        );
      })}
    </HakutulosLista>
  );
}
