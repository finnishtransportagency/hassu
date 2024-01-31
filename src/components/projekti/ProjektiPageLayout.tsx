import Notification, { NotificationType } from "@components/notification/Notification";
import React, { ReactElement, ReactNode } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiSideNavigation from "./ProjektiSideNavigation";
import { IconButton, Stack, SvgIcon } from "@mui/material";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import AsianhallintaStatusNotification from "./AsianhallintaStatusNotification";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Vaihe } from "@services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  children: ReactNode;
  title: string;
  vaihe?: Vaihe;
  contentAsideTitle?: ReactNode;
  showInfo?: boolean;
  onOpenInfo?: () => void;
}

export default function ProjektiPageLayout({
  children,
  title,
  contentAsideTitle,
  showInfo = false,
  onOpenInfo,
  vaihe,
}: Props): ReactElement {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8 mb-3">
        <div style={{ minWidth: "345px" }}>
          <ProjektiSideNavigation />
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
              {showInfo && (
                <IconButton onClick={onOpenInfo}>
                  <SvgIcon>
                    <FontAwesomeIcon icon="info-circle" />
                  </SvgIcon>
                </IconButton>
              )}
            </h1>

            {contentAsideTitle}
          </Stack>
          <ContentSpacer gap={7}>
            <h2>{projekti?.velho?.nimi || "-"}</h2>
            {projekti && projektiOnEpaaktiivinen(projekti) ? (
              <Notification type={NotificationType.INFO_GRAY}>
                Projekti on siirtynyt epäaktiiviseen tilaan. Projektille voi luoda jatkokuulutuksen, kun pääkäyttäjä on palauttanut
                projektin aktiiviseen tilaan. Voit seurata suunnitelman käsittelyä Käsittelyn tila -sivulta. Jos sinulla on kysyttävää, ota
                yhteys järjestelmän pääkäyttäjään.
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
                        Järjestelmän kautta on lähetetty {projekti.muistutusMaara} kpl muistutuksia tähän suunnitelmaan.
                      </Notification>
                    )}
                  </>
                )}
              </>
            )}
          </ContentSpacer>
          {children}
        </div>
      </div>
    </section>
  );
}
