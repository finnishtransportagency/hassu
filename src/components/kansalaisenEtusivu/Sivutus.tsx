import {
  SivunumeroLista,
  SivunumeroNykyinen,
  SivunumeroLinkki,
  NavigointiNapit,
  NavigointiNappiDesktop,
  NavigointiNapitMobiili,
  NavigointiNappiMobiili,
} from "./TyylitellytKomponentit";
import useTranslation from "next-translate/useTranslation";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

type Props = {
  sivuMaara: number;
};
export default function Sivutus({ sivuMaara }: Props) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const { t } = useTranslation();

  if (sivuMaara <= 1) {
    return null;
  }

  sivuMaara = 26;

  const nykyinenSivu = 1; //TODO lue query parametreista

  return (
    <>
      {desktop && (
        <SivunumeroLista>
          {t("common:sivut")}
          {": "}
          {Array.from({ length: sivuMaara }, (_, i) => i + 1).map((sivuNumero) =>
            sivuNumero === nykyinenSivu ? (
              <SivunumeroNykyinen key={sivuNumero}>{sivuNumero}</SivunumeroNykyinen>
            ) : (
              <SivunumeroLinkki href="TODO" key={sivuNumero}>
                {sivuNumero}
              </SivunumeroLinkki>
            )
          )}
        </SivunumeroLista>
      )}
      {desktop ? (
        <NavigointiNapit>
          <NavigointiNappiDesktop className={nykyinenSivu === 1 ? "disabled" : ""}>{t("common:edellinen")}</NavigointiNappiDesktop>
          <NavigointiNappiDesktop className={nykyinenSivu === sivuMaara ? "disabled" : ""}>{t("common:seuraava")}</NavigointiNappiDesktop>
        </NavigointiNapit>
      ) : (
        <NavigointiNapitMobiili>
          <NavigointiNappiMobiili className={nykyinenSivu === 1 ? "disabled" : ""}>{t("common:edellinen")}</NavigointiNappiMobiili>
          <NavigointiNappiMobiili className={nykyinenSivu === sivuMaara ? "disabled" : ""}>{t("common:seuraava")}</NavigointiNappiMobiili>
        </NavigointiNapitMobiili>
      )}
    </>
  );
}
