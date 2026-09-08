// Contains code generated or recommended by Amazon Q
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, ReactNode, createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiSideNavigation from "./ProjektiSideNavigation";
import { IconButton, Stack, SvgIcon, useMediaQuery, useTheme } from "@mui/material";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import AsianhallintaStatusNotification from "./AsianhallintaStatusNotification";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Vaihe } from "@services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import deburr from "lodash/deburr";
import { isKuntatietoMissing } from "../../util/velhoUtils";
import KuntatietoMissingNotification from "../KuntatietoMissingNotification";

interface Props {
  children: ReactNode;
  title: string;
  vaihe?: Vaihe;
  contentAsideTitle?: ReactNode;
  showInfo?: boolean;
}

type ContextProps = {
  ohjeetOpen: boolean;
  ohjeetOnClose: () => void;
  ohjeetOnOpen: () => void;
};

export const ProjektiPageLayoutContext = createContext<ContextProps>({ ohjeetOnClose: () => {}, ohjeetOnOpen: () => {}, ohjeetOpen: true });

export default function ProjektiPageLayout({ children, title, contentAsideTitle, vaihe, showInfo }: Readonly<Props>): ReactElement {
  const { data: projekti } = useProjekti();

  const localStorageKey = useMemo(() => {
    return `${deburr(title).replace(/[^a-zA-Z]/g, "_")}Ohjeet`;
  }, [title]);

  const [ohjeetOpen, setOhjeetOpen] = useState(false);
  // access localStorage only in client side (browser), safeguard for SSR
  useEffect(() => {
    const savedValue = localStorage.getItem(localStorageKey);
    const isOpen = savedValue ? savedValue.toLowerCase() !== "false" : true;
    setOhjeetOpen(isOpen);
  }, [localStorageKey]);

  const ohjeetOnClose = useCallback(() => {
    setOhjeetOpen(false);
    localStorage.setItem(localStorageKey, "false");
  }, [localStorageKey]);

  const ohjeetOnOpen = useCallback(() => {
    setOhjeetOpen(true);
    localStorage.setItem(localStorageKey, "true");
  }, [localStorageKey]);

  const contextValue = useMemo(() => ({ ohjeetOpen, ohjeetOnClose, ohjeetOnOpen }), [ohjeetOnClose, ohjeetOpen, ohjeetOnOpen]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sidebarTop, setSidebarTop] = useState(0);
  const sidebarTopRef = useRef(sidebarTop);
  sidebarTopRef.current = sidebarTop;
  const initialGapRef = useRef<number | null>(null);

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      const header = document.querySelector("header");
      const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      if (initialGapRef.current === null) {
        const main = document.querySelector("main");
        if (main && headerBottom > 0) {
          initialGapRef.current = main.getBoundingClientRect().top - headerBottom;
        }
      }
      const gap = initialGapRef.current ?? 0;
      const next = headerBottom + gap;
      if (next !== sidebarTopRef.current) {
        setSidebarTop(next);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!projekti) {
    return <></>;
  }

  return (
    <ProjektiPageLayoutContext.Provider value={contextValue}>
      <section>
        <div className="flex flex-col md:flex-row gap-8 mb-3">
          <div
            data-sidebar
            style={{
              minWidth: "345px",
              ...(!isMobile && {
                position: "sticky",
                top: sidebarTop,
                alignSelf: "flex-start",
              }),
            }}
          >
            <div
              style={
                !isMobile
                  ? { maxHeight: `calc(100vh - ${sidebarTop}px)`, overflowY: "auto" }
                  : undefined
              }
            >
              <ProjektiSideNavigation />
            </div>
          </div>
          <div className="grow min-w-0">
            <Stack
              sx={{ marginBottom: { xs: 3, sm: 0 } }}
              alignItems="flex-start"
              justifyContent="space-between"
              direction={{ xs: "column", sm: "row" }}
              rowGap={0}
            >
              <h1>
                {title}{" "}
                {!ohjeetOpen && showInfo && (
                  <IconButton onClick={ohjeetOnOpen}>
                    <SvgIcon>
                      <FontAwesomeIcon icon="info-circle" />
                    </SvgIcon>
                  </IconButton>
                )}
              </h1>

              {contentAsideTitle}
            </Stack>
            <ContentSpacer gap={7}>
              <p className="vayla-lead">{projekti?.velho?.nimi ?? "-"}</p>
              {projekti && projektiOnEpaaktiivinen(projekti) ? (
                <Notification type={NotificationType.INFO_GRAY}>
                  Projekti on siirtynyt epäaktiiviseen tilaan. Projektille voi luoda jatkokuulutuksen, kun pääkäyttäjä on palauttanut
                  projektin aktiiviseen tilaan. Voit seurata suunnitelman käsittelyä Käsittelyn tila -sivulta. Jos sinulla on kysyttävää,
                  ota yhteys järjestelmän pääkäyttäjään.
                </Notification>
              ) : (
                <>
                  {!projekti?.nykyinenKayttaja.omaaMuokkausOikeuden ? (
                    <Notification type={NotificationType.WARN}>
                      Sinulla on projektiin vain lukuoikeudet. Voit tarkastella projektin tietoja, mutta et voi tehdä siihen muutoksia. Jos
                      tarvitset oikeudet projektiin, ota yhteys projektin projektipäällikköön.
                    </Notification>
                  ) : (
                    <>
                      {projekti.asianhallinta.aktivoitavissa && vaihe && (
                        <AsianhallintaStatusNotification projekti={projekti} vaihe={vaihe} />
                      )}
                      {!!projekti.muistutusMaara && (
                        <Notification type={NotificationType.INFO_GRAY}>
                          Järjestelmän kautta on lähetetty {projekti.muistutusMaara} kpl muistutuksia tähän suunnitelmaan. Muistutukset
                          löytyvät asianhallinnasta.
                        </Notification>
                      )}
                    </>
                  )}
                </>
              )}
              {isKuntatietoMissing(projekti) && <KuntatietoMissingNotification projekti={projekti} />}
            </ContentSpacer>
            {children}
          </div>
        </div>
      </section>
    </ProjektiPageLayoutContext.Provider>
  );
}
