import React, { ReactElement, useMemo, ReactNode, useState, useCallback } from "react";
import ProjektiPageLayout, { ProjektiPageLayoutContext } from "@components/projekti/ProjektiPageLayout";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { DialogActions, DialogContent, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../../ProjektiConsumer";
import Button from "@components/button/Button";
import { KuulutusJulkaisuTila, TilasiirtymaToiminto, TilasiirtymaTyyppi, Vaihe, VuorovaikutusKierrosTila } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import useApi from "src/hooks/useApi";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineJulkaisuPaiva, formatDate } from "hassu-common/util/dateUtils";
import ContentSpacer from "@components/layout/ContentSpacer";
import AiemmatVuorovaikutuksetOsio from "./AiemmatVuorovaikutuksetOsio";
import HassuDialog from "@components/HassuDialog";
import log from "loglevel";
import { EdellinenVaiheMigroituNotification } from "@components/projekti/EdellinenVaiheMigroituNotification";
import { OhjelistaNotification } from "@components/projekti/common/OhjelistaNotification";

export default function SuunnitteluPageLayoutWrapper({
  children,
  showLuoUusiKutsuButton,
}: Readonly<{
  children?: ReactNode;
  showLuoUusiKutsuButton?: boolean;
}>) {
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <SuunnitteluPageLayout
          projektiOid={projekti.oid}
          projekti={projekti}
          disableTabs={!projekti.vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan}
          showLuoUusiKutsuButton={showLuoUusiKutsuButton}
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
  children,
  showLuoUusiKutsuButton,
}: Readonly<{
  projektiOid: string;
  projekti: ProjektiLisatiedolla;
  disableTabs?: boolean;
  children?: ReactNode;
  showLuoUusiKutsuButton?: boolean;
}>): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const { showSuccessMessage } = useSnackbars();
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
      log.error(error);
    }
    if (mounted) {
      closeUusiKierrosDialog();
    }
    return () => {
      mounted = false;
    };
  }, [api, closeUusiKierrosDialog, projekti, reloadProjekti, router, showSuccessMessage]);

  const { vuorovaikutusKierros } = projekti;
  const tilaJulkinen = vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;
  const { julkaisuPaiva, published } = examineJulkaisuPaiva(tilaJulkinen, vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva);
  const migroitu = vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;
  const edellinenVaiheMigroitu = projekti.aloitusKuulutusJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU;

  return (
    <ProjektiPageLayout
      title="Suunnittelu"
      vaihe={Vaihe.SUUNNITTELU}
      showInfo={!published}
      contentAsideTitle={
        showLuoUusiKutsuButton && (
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
        {!published && !migroitu && edellinenVaiheMigroitu && <EdellinenVaiheMigroituNotification oid={projekti?.oid} />}
        {published && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kutsu vuorovaikutustilaisuuksiin on julkaistu {julkaisuPaiva}.{" "}
            {!projekti.nahtavillaoloVaiheJulkaisu ? "Vuorovaikutustilaisuuksien tietoja pääsee muokkaamaan enää rajoitetusti." : ""}
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
            <ProjektiPageLayoutContext.Consumer>
              {({ ohjeetOpen, ohjeetOnClose }) => (
                <OhjelistaNotification
                  asianhallintaTiedot={{ vaihe: Vaihe.SUUNNITTELU, projekti }}
                  open={ohjeetOpen}
                  onClose={ohjeetOnClose}
                >
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
                  {projekti.asianhallinta.inaktiivinen && <li>Muistathan viedä kutsun asianhallintaan.</li>}
                  {!projekti.asianhallinta.inaktiivinen && (
                    <li>Kutsu siirtyy automaattisesti asianhallintaan kuulutuksen hyväksymisen yhteydessä.</li>
                  )}
                </OhjelistaNotification>
              )}
            </ProjektiPageLayoutContext.Consumer>
          ) : (
            <p>
              Suunnitteluvaihe käsittää kansalaisille näytettäviä perustietoja suunnittelun etenemisestä sekä vuorovaikutustilaisuuksien
              tiedot. Suunnitteluvaiheen perustiedot -välilehdelle kirjataan kansalaisille suunnattua yleistä tietoa suunnitelmasta,
              suunnittelun etenemisestä sekä aikatauluarvio. Suunnitteluvaiheen perustiedot näkyvät kansalaiselle palvelun julkisella
              puolella. Kyseisen välilehden tietoja on mahdollista päivittää koko suunnitteluvaiheen ajan.
              <br />
              <br />
              Toiselta välilehdeltä pääsee tarkastelemaan vuorovaikutustilaisuuksien ja kutsun tietoja.
            </p>
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
