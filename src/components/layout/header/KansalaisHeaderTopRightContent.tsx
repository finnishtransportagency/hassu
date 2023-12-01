import React, { FunctionComponent } from "react";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { Kieli } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import setLanguage from "next-translate/setLanguage";
import { Box, BoxProps, styled } from "@mui/system";
import { getSuomiFiAuthenticationURL, getSuomiFiLogoutURL } from "@services/userService";
import useSuomifiUser from "../../../hooks/useSuomifiUser";

const KansalaisHeaderTopRightContent: FunctionComponent = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();
  const { showInfoMessage } = useSnackbars();

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
      <SuomiFiLogin />
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
  color: locale === activeLocale ? theme.palette.text.primary : theme.palette.primary.dark,
  "&:hover": {
    textDecoration: locale === activeLocale ? undefined : "underline",
  },
}));

const SuomiFiLogin = styled((props) => {
  const { data } = useSuomifiUser();
  if (data?.suomifiEnabled) {
    if (!data.tunnistautunut) {
      const suomiFiAuthenticationURL = getSuomiFiAuthenticationURL();
      if (!suomiFiAuthenticationURL) {
        return <></>;
      }
      return (
        <a href={suomiFiAuthenticationURL} {...props}>
          Kirjaudu Suomi.fi (test)
        </a>
      );
    } else {
      const logoutURL = getSuomiFiLogoutURL();
      return (
        <a
          href={logoutURL}
          {...props}
          onClick={() => {
            document.cookie = "x-vls-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }}
        >
          {data.etunimi} {data.sukunimi}
        </a>
      );
    }
  } else {
    return <></>;
  }
})(({ theme }) => ({
  color: theme.palette.primary.dark,
  "&:hover": {
    textDecoration: "underline",
  },
}));

export default KansalaisHeaderTopRightContent;
