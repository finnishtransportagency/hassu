import React, { ReactElement, useMemo, ReactNode, useState, useCallback } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { DialogActions, DialogContent, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../../ProjektiConsumer";
import Button from "@components/button/Button";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi, VuorovaikutusKierrosTila } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import useApi from "src/hooks/useApi";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineJulkaisuPaiva, formatDate } from "../../../../../common/util/dateUtils";
import ContentSpacer from "@components/layout/ContentSpacer";
import AiemmatVuorovaikutuksetOsio from "./AiemmatVuorovaikutuksetOsio";
import HassuDialog from "@components/HassuDialog";
import { projektillaOnMigroituJulkaisu } from "../../../../util/statusUtil";
import { AiempiVaiheMigroituNotification } from "@components/projekti/AiempiVaiheMigroituNotification";

export default function SuunnitteluPageLayoutWrapper({ lukutila, children }: { lukutila?: boolean; children?: ReactNode }) {
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <SuunnitteluPageLayout
          projektiOid={projekti.oid}
          projekti={projekti}
          disableTabs={!(projekti && projekti.vuorovaikutusKierros && projekti.vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan)}
          lukutila={lukutila}
        >
          {children}
        </SuunnitteluPageLayout>
      )}
    </ProjektiConsumer>
  );
}

function SuunnitteluPageLayout({
  projektiOid,
  projekti,
  disableTabs,
  lukutila,
  children,
}: {
  projektiOid: string;
  projekti: ProjektiLisatiedolla;
  disableTabs?: boolean;
  lukutila?: boolean;
  children?: ReactNode;
}): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const { mutate: reloadProjekti } = useProjekti();

  const openUusiKierrosDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeUusiKierrosDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const tabProps: LinkTabProps[] = useMemo(() => {
    const vuorovaikutusNumero: number = projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 1;

    const vuorovaikutusTab = {
      linkProps: {
        href: {
          pathname: `/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen`,
          query: { oid: projektiOid },
        },
      },
      label: vuorovaikutusNumero === 1 ? "Kutsu vuorovaikutukseen" : `${vuorovaikutusNumero}. kutsu vuorovaikutukseen`,
      disabled: disableTabs,
      id: `vuorovaikuttaminen_tab`,
    };
    return [
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/suunnittelu`,
            query: { oid: projektiOid },
          },
        },
        label:
          vuorovaikutusNumero === 1 ? (
            "Suunnitteluvaiheen perustiedot"
          ) : (
            <div>
              <div>Suunnitteluvaiheen perustiedot</div>
              <div>{`(${vuorovaikutusNumero}. kutsu)`}</div>
            </div>
          ),
        disabled: false,
        id: "perustiedot_tab",
      },
      vuorovaikutusTab,
    ];
  }, [projekti.vuorovaikutusKierros?.vuorovaikutusNumero, projektiOid, disableTabs]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, tabProps]);

  const api = useApi();

  const luoUusiVuorovaikutus = useCallback(async () => {
    let mounted = true;
    if (!projekti) {
      return;
    }
    try {
      await api.siirraTila({
        oid: projekti.oid,
        tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
        toiminto: TilasiirtymaToiminto.LUO_UUSI_KIERROS,
      });
      showSuccessMessage("Uusi vuorovaikutuskierros luotu");
      await reloadProjekti();
      const pathname = "/yllapito/projekti/[oid]/suunnittelu";
      if (router.pathname !== pathname) {
        await router.push({ pathname, query: { oid: projekti.oid } });
      }
    } catch (error) {
      showErrorMessage("Toiminto epäonnistui");
    }
    if (mounted) {
      closeUusiKierrosDialog();
    }
    return () => {
      mounted = false;
    };
  }, [api, closeUusiKierrosDialog, projekti, reloadProjekti, router, showErrorMessage, showSuccessMessage]);

  const { vuorovaikutusKierros } = projekti;
  const tilaJulkinen = vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;
  const { julkaisuPaiva, published } = examineJulkaisuPaiva(tilaJulkinen, vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva);
  const migroitu = vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;

  return (
    <ProjektiPageLayout
      title="Suunnittelu"
      contentAsideTitle={
        !lukutila && (
          <Button
            id="uusi_kutsu_button"
            onClick={openUusiKierrosDialog}
            disabled={!vuorovaikutusKierros?.isOkToMakeNewVuorovaikutusKierros}
            type="button"
          >
            Luo uusi kutsu
          </Button>
        )
      }
    >
      <ContentSpacer sx={{ marginTop: 7 }} gap={7}>
        {!published && !migroitu && projektillaOnMigroituJulkaisu(projekti) && <AiempiVaiheMigroituNotification oid={projekti?.oid} />}
        {published && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kutsu vuorovaikutustilaisuuksiin on julkaistu {julkaisuPaiva}. Vuorovaikutustilaisuuksien tietoja pääsee muokkaamaan enää
            rajoitetusti.
          </Notification>
        )}
        {tilaJulkinen && !published && (
          <Notification type={NotificationType.WARN}>
            Vuorovaikuttamista ei ole vielä julkaistu palvelun julkisella puolella. Julkaisu{" "}
            {formatDate(vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva)}.
            {!vuorovaikutusKierros?.esittelyaineistot?.length && !vuorovaikutusKierros?.suunnitelmaluonnokset?.length
              ? " Huomaathan, että suunnitelma-aineistot tulee vielä lisätä Suunnitteluvaiheen perustiedot -välilehdelle."
              : ""}
          </Notification>
        )}
        {!migroitu &&
          (!tilaJulkinen ? (
            <Notification type={NotificationType.INFO} hideIcon>
              <div>
                <h3 className="vayla-small-title">Ohjeet</h3>
                <ul className="list-disc block pl-5">
                  <li>
                    Suunnitteluvaihe käsittää kansalaisille näytettäviä perustietoja suunnittelun etenemisestä sekä
                    vuorovaikutustilaisuuksien tiedot.
                  </li>
                  <li>
                    Suunnitteluvaiheen perustiedot -välilehdelle kirjataan kansalaisille suunnattua yleistä tietoa suunnitelmasta,
                    suunnittelun etenemisestä sekä aikatauluarvio. Perustiedot näkyvät kansalaisille palvelun julkisella puolella kutsun
                    julkaisun jälkeen.
                  </li>
                  <li>Suunnitteluvaiheen perustietoja pystyy päivittämään kutsun julkaisun jälkeen, mm. lisäämään aineistoja.</li>
                  <li>Vuorovaikutustilaisuuksien tiedot lisätään kutsuun Kutsu vuorovaikutukseen -välilehdeltä.</li>
                  <li>
                    Kutsu on hyvä tehdä valmiiksi ja tallentaa julkaistavaksi noin viikko ennen sen julkaisua, jotta kunnat saavat tiedon
                    kutsusta ajoissa.
                  </li>
                  <li>Voit hyödyntää lehti-ilmoituksen tilauksessa järjestelmässä luotua kutsun luonnosta.</li>
                  <li>
                    Suunnitelma näkyy kansalaisille suunnitteluvaiheessa olevana kutsun julkaisusta nähtäville asettamisen kuulutuksen
                    julkaisuun asti.
                  </li>
                  <li>Muistathan viedä kutsun ja ilmoituksen kutsusta asianhallintaan.</li>
                </ul>
              </div>
            </Notification>
          ) : (
            <>
              <p>
                Suunnitteluvaihe käsittää kansalaisille näytettäviä perustietoja suunnittelun etenemisestä sekä vuorovaikutustilaisuuksien
                tiedot. Suunnitteluvaiheen perustiedot -välilehdelle kirjataan kansalaisille suunnattua yleistä tietoa suunnitelmasta,
                suunnittelun etenemisestä sekä aikatauluarvio. Suunnitteluvaiheen perustiedot näkyvät kansalaiselle palvelun julkisella
                puolella. Kyseisen välilehden tietoja on mahdollistaa päivittää koko suunnitteluvaiheen ajan.
                <br />
                <br />
                Toiselta välilehdeltä pääsee tarkastelemaan vuorovaikutustilaisuuksien ja kutsun tietoja.
              </p>
            </>
          ))}
        <AiemmatVuorovaikutuksetOsio projekti={projekti} />
        {!migroitu && (
          <Tabs value={value}>
            {tabProps.map((tProps, index) => (
              <LinkTab key={index} {...tProps} />
            ))}
          </Tabs>
        )}
      </ContentSpacer>
      <HassuDialog title="Luo uusi kutsu" onClose={closeUusiKierrosDialog} open={dialogOpen}>
        <DialogContent>
          <p>Luomalla uuden kutsun vuorovaikutukseen mahdollistat uusien vuorovaikutustilaisuuksen pitämisen.</p>
          <p>Painamalla Kyllä-painiketta avaat uuden kutsupohjan muokattavaksi.</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={luoUusiVuorovaikutus} id={"accept_luo_uusi_kutsu_button"} primary>
            Kyllä
          </Button>
          <Button onClick={closeUusiKierrosDialog}>Peruuta</Button>
        </DialogActions>
      </HassuDialog>
      {children}
    </ProjektiPageLayout>
  );
}
