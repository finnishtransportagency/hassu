import React, { FunctionComponent } from "react";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { Kieli } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import setLanguage from "next-translate/setLanguage";
import { Box, BoxProps, styled } from "@mui/system";
import SuomiFiLogin from "./SuomiFiLogin";

const KansalaisHeaderTopRightContent: FunctionComponent = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();
  const { showInfoMessage } = useSnackbars();

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
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
      <SuomiFiLogin />
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
