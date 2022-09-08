import { SivunumeroLista, SivunumeroNykyinen, SivunumeroLinkki, NavigointiNapit, NavigointiNappi } from "./TyylitellytKomponentit";
import useTranslation from "next-translate/useTranslation";

type Props = {
  sivuMaara: number;
};
export default function Sivutus({ sivuMaara }: Props) {
  const { t } = useTranslation();

  if (sivuMaara <= 1) {
    return null;
  }

  sivuMaara = 26;

  const nykyinenSivu = 1; //TODO lue query parametreista

  return (
    <>
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
      <NavigointiNapit>
        <NavigointiNappi className={nykyinenSivu === 1 ? "disabled" : ""}>{t("common:edellinen")}</NavigointiNappi>
        <NavigointiNappi className={nykyinenSivu === sivuMaara ? "disabled" : ""}>{t("common:seuraava")}</NavigointiNappi>
      </NavigointiNapit>
    </>
  );
}
