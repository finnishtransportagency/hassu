import React, { FunctionComponent, useCallback, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { Kieli } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import setLanguage from "next-translate/setLanguage";
import { Box, BoxProps, styled } from "@mui/system";
import { SuomiFiLoginComponent } from "./SuomiFiLogin";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, useMediaQuery, useTheme } from "@mui/material";
import Button from "@components/button/Button";
import { getSuomiFiLogoutURL } from "@services/userService";

const KansalaisHeaderTopRightContent: FunctionComponent = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: projekti } = useProjektiJulkinen();
  const { showInfoMessage } = useSnackbars();
  const [kirjautunutOpen, setKirjautunutOpen] = useState(router.asPath.indexOf("#kirjautunut") !== -1);
  const closeDialog = useCallback(() => setKirjautunutOpen(false), []);
  const [sessioVanhentunut, setSessioVanhentunut] = useState(false);
  const closeSessioDialog = useCallback(() => {
    setSessioVanhentunut(false);
    router.push(getSuomiFiLogoutURL());
  }, [router]);
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
      <HassuDialog fullScreen={isMobile} open={kirjautunutOpen} title={t("kirjautuminen_onnistui")} maxWidth="sm" onClose={closeDialog}>
        <DialogContent>
          <p>{t("kirjautuminen_ohje")}</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t("sulje")}</Button>
        </DialogActions>
      </HassuDialog>
      <HassuDialog open={sessioVanhentunut} title={t("istunto_vanhentunut")} maxWidth="sm" onClose={closeSessioDialog}>
        <DialogContent>
          <p>{t("istunto_vanhentunut_teksti")}</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSessioDialog}>{t("sulje")}</Button>
        </DialogActions>
      </HassuDialog>
      <LanguageSelector activeLocale={router.locale} locale="fi" setAsActiveLocale={async () => await setLanguage("fi", false)}>
        Suomi
      </LanguageSelector>
      <LanguageSelector
        activeLocale={router.locale}
        locale="sv"
        setAsActiveLocale={async () => {
          if (
            projekti &&
            projekti.kielitiedot?.ensisijainenKieli !== Kieli.RUOTSI &&
            projekti.kielitiedot?.toissijainenKieli !== Kieli.RUOTSI
          ) {
            showInfoMessage(t("commonSV:projekti_ei_ruotsin_kielella"));
            return router.push("/", undefined, { locale: "sv" });
          }
          await setLanguage("sv", false);
        }}
      >
        Svenska
      </LanguageSelector>
      <SuomiFiLoginComponent setSessioVanhentunut={setSessioVanhentunut} />
    </div>
  );
};

type LanguageSelectorProps = Omit<BoxProps, "component" | "onClick"> & {
  locale: "sv" | "fi";
  activeLocale: string | undefined;
  setAsActiveLocale: () => void;
};

const LanguageSelector = styled(({ locale, activeLocale, setAsActiveLocale, ...props }: LanguageSelectorProps) => (
  <Box
    component={locale === activeLocale ? "span" : "button"}
    onClick={locale === activeLocale ? undefined : setAsActiveLocale}
    {...props}
  />
))(({ theme, locale, activeLocale }) => ({
  alignSelf: "center",
  color: locale === activeLocale ? theme.palette.text.primary : theme.palette.primary.dark,
  "&:hover": {
    textDecoration: locale === activeLocale ? undefined : "underline",
  },
}));

export default KansalaisHeaderTopRightContent;
