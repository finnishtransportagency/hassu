import {
  SivunumeroLista,
  SivunumeroNykyinen,
  SivunumeroLinkki,
  NavigointiNapit,
  NavigointiNappiDesktop,
  NavigointiNapitMobiili,
  NavigointiNappiMobiili,
  NavigointiNappiDesktopDisabled,
  NavigointiNappiMobiiliDisabled,
} from "./TyylitellytKomponentit";
import useTranslation from "next-translate/useTranslation";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { NextRouter, useRouter } from "next/router";

type Props = {
  sivuMaara: number;
};

function getPageLink(router: NextRouter, pageNumber: number) {
  router.pathname;
  const newQuery = { ...router.query, page: pageNumber.toString() };
  return `${router.pathname}?${new URLSearchParams(newQuery).toString()}`;
}

export default function Sivutus({ sivuMaara }: Props) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { t } = useTranslation();
  const router = useRouter();

  if (sivuMaara <= 1) {
    return null;
  }

  const nykyinenSivu = typeof router.query.page === "string" ? parseInt(router.query.page) : 1;

  return (
    <>
      {desktop && ( // näytä sivunumerolista vain desktopissa
        <SivunumeroLista>
          {t("common:sivut")}
          {": "}
          {Array.from({ length: sivuMaara }, (_, i) => i + 1).map((sivuNumero) =>
            sivuNumero === nykyinenSivu ? (
              <SivunumeroNykyinen key={sivuNumero}>{sivuNumero}</SivunumeroNykyinen>
            ) : (
              <SivunumeroLinkki href={getPageLink(router, sivuNumero)} key={sivuNumero}>
                {sivuNumero}
              </SivunumeroLinkki>
            )
          )}
        </SivunumeroLista>
      )}
      {desktop ? ( // desktopissa ja mobiilissa näkyy erilailla tyylitellyt napit
        <NavigointiNapit>
          {nykyinenSivu === 1 ? ( // epäaktiivinen nappi ei ole linkki vaan div
            <NavigointiNappiDesktopDisabled>{t("common:edellinen")}</NavigointiNappiDesktopDisabled>
          ) : (
            <NavigointiNappiDesktop href={getPageLink(router, Math.max(1, nykyinenSivu - 1))}>
              {t("common:edellinen")}
            </NavigointiNappiDesktop>
          )}
          {nykyinenSivu === sivuMaara ? ( // epäaktiivinen nappi ei ole linkki vaan div
            <NavigointiNappiDesktopDisabled>{t("common:seuraava")}</NavigointiNappiDesktopDisabled>
          ) : (
            <NavigointiNappiDesktop href={getPageLink(router, Math.min(sivuMaara, nykyinenSivu + 1))}>
              {t("common:seuraava")}
            </NavigointiNappiDesktop>
          )}
        </NavigointiNapit>
      ) : (
        <NavigointiNapitMobiili>
          {nykyinenSivu === 1 ? ( // epäaktiivinen nappi ei ole linkki vaan div
            <NavigointiNappiMobiiliDisabled>{t("common:edellinen")}</NavigointiNappiMobiiliDisabled>
          ) : (
            <NavigointiNappiMobiili href={getPageLink(router, Math.max(1, nykyinenSivu - 1))}>
              {t("common:edellinen")}
            </NavigointiNappiMobiili>
          )}
          {nykyinenSivu === sivuMaara ? ( // epäaktiivinen nappi ei ole linkki vaan div
            <NavigointiNappiMobiiliDisabled>{t("common:seuraava")}</NavigointiNappiMobiiliDisabled>
          ) : (
            <NavigointiNappiMobiili href={getPageLink(router, Math.min(sivuMaara, nykyinenSivu + 1))}>
              {t("common:seuraava")}
            </NavigointiNappiMobiili>
          )}
        </NavigointiNapitMobiili>
      )}
    </>
  );
}
