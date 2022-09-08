import { Container } from "@mui/material";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { HeaderProps } from "./header";
import { useRouter } from "next/router";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { Kieli } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import Link from "next/link";
import setLanguage from "next-translate/setLanguage";
import HeaderNavigationItem, { NavigationRoute } from "../navigation/HeaderNavigationItem";

export function KansalaisHeader({ scrolledPastOffset }: HeaderProps): ReactElement {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();
  const { showInfoMessage } = useSnackbars();
  const [headerTop, setHeaderTop] = useState<number>(0);
  const headerTopPortion = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offset = headerTopPortion.current?.clientHeight;
    if (offset) {
      setHeaderTop(offset);
    }
  }, [headerTopPortion]);

  const navigationRoutes: NavigationRoute[] = [
    {
      label: "Etusivu",
      href: "/",
      icon: "home",
    },
    {
      label: "Tietoja palvelusta",
      href: "/",
    },
  ];

  return (
    <Container
      className="sticky bg-white z-20 w-full transition-all"
      component="header"
      sx={{ top: `${scrolledPastOffset ? -headerTop : 0}px` }}
    >
      <div ref={headerTopPortion}>
        <div className="flex border-b border-gray-light py-5 flex-wrap justify-between gap-x-5 gap-y-5">
          <Link href="/">
            <a className="flex flex-col uppercase vayla-small-title">
              <span>{t("commonFI:sivustonimi")}</span>
              <span className="font-normal">{t("commonSV:sivustonimi")}</span>
            </a>
          </Link>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <span
              className={router.locale === "fi" ? undefined : "text-primary-dark"}
              style={{ cursor: "pointer" }}
              onClick={async () => await setLanguage("fi")}
            >
              Suomi
            </span>
            <span
              className={router.locale === "sv" ? undefined : "text-primary-dark"}
              style={{ cursor: "pointer" }}
              onClick={async () => {
                if (
                  projekti &&
                  projekti.kielitiedot?.ensisijainenKieli !== Kieli.RUOTSI &&
                  projekti.kielitiedot?.toissijainenKieli !== Kieli.RUOTSI
                ) {
                  showInfoMessage(t("commonSV:projekti_ei_ruotsin_kielella"));
                  return router.push("/", undefined, { locale: "sv" });
                }
                await setLanguage("sv");
              }}
            >
              Svenska
            </span>
          </div>
        </div>
      </div>
      <nav className="flex py-6 vayla-navigation uppercase">
        <ul className="flex float-left flex-wrap space-x-20">
          {navigationRoutes.map((route, index) => (
            <HeaderNavigationItem key={index} {...route} />
          ))}
        </ul>
      </nav>
      <div className="pb-2" style={{ background: "linear-gradient(117deg, #009ae0, #49c2f1)" }}></div>
    </Container>
  );
}

export default KansalaisHeader;
