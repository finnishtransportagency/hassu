import React, { ReactElement, useMemo, ReactNode, useState, useCallback } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Section from "@components/layout/Section";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { Dialog, DialogActions, DialogContent, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { ParsedUrlQueryInput } from "querystring";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../ProjektiConsumer";
import Button from "@components/button/Button";
import dayjs from "dayjs";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi, VuorovaikutusKierrosTila } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import useApi from "src/hooks/useApi";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineJulkaisuPaiva } from "../../../util/dateUtils";

export default function SuunnitteluPageLayoutWrapper({ children }: { children?: ReactNode }) {
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <SuunnitteluPageLayout projektiOid={projekti.oid} projekti={projekti} disableTabs={!(projekti && projekti.vuorovaikutusKierros)}>
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
}: {
  projektiOid: string;
  projekti: ProjektiLisatiedolla;
  disableTabs?: boolean;
  children?: ReactNode;
}): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const { mutate: reloadProjekti } = useProjekti();

  const vuorovaikutusKierrosNumerot: number[] = useMemo(() => {
    return projekti.vuorovaikutusKierros?.vuorovaikutusNumero ? [...Array(projekti.vuorovaikutusKierros?.vuorovaikutusNumero).keys()] : [0];
  }, [projekti.vuorovaikutusKierros?.vuorovaikutusNumero]);

  const tabProps: LinkTabProps[] = useMemo(() => {
    const vuorovaikutusTabs = vuorovaikutusKierrosNumerot.map<LinkTabProps>((kierrosId) => {
      return {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen/[kierrosId]`,
            query: { oid: projektiOid, kierrosId: (kierrosId + 1).toString() },
          },
        },
        label: `${kierrosId + 1}. vuorovaikuttaminen`,
        disabled: disableTabs,
        id: `${kierrosId}_vuorovaikuttaminen_tab`,
      };
    });
    return [
      {
        linkProps: {
          href: {
            pathname: `/yllapito/projekti/[oid]/suunnittelu`,
            query: { oid: projektiOid },
          },
        },
        label: "Suunnitteluvaiheen perustiedot",
        disabled: false,
        id: "perustiedot_tab",
      },
      ...vuorovaikutusTabs,
    ];
  }, [projektiOid, vuorovaikutusKierrosNumerot, disableTabs]);

  const value = useMemo(() => {
    const indexOfTab = tabProps.findIndex((tProps) => {
      const url = tProps.linkProps.href as UrlObject;
      return url.pathname === router.pathname && (url.query as ParsedUrlQueryInput).kierrosId === router.query.kierrosId;
    });
    return indexOfTab === -1 ? false : indexOfTab;
  }, [router.pathname, router.query.kierrosId, tabProps]);

  const kaikkiTilaisuudetMenneet = projekti.vuorovaikutusKierrosJulkaisut?.[
    projekti.vuorovaikutusKierrosJulkaisut.length - 1
  ]?.vuorovaikutusTilaisuudet?.every((tilaisuus) => {
    const julkaisuPaiva = dayjs(tilaisuus.paivamaara);
    const seuraavaPaiva = julkaisuPaiva.add(1, "day");
    return seuraavaPaiva.isBefore(dayjs());
  });

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
        toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
      });
      showSuccessMessage("Uusi vuorovaikutuskierros luotu");
      await reloadProjekti();
    } catch (error) {
      showErrorMessage("Toiminto epäonnistui");
    }
    if (mounted) {
      setDialogOpen(false);
    }
    () => {
      mounted = false;
    };
  }, [api, projekti, reloadProjekti, showErrorMessage, showSuccessMessage]);

  const { vuorovaikutusKierros } = projekti;
  const julkinen = vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;
  const { julkaisuPaiva, published } = examineJulkaisuPaiva(julkinen, vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva);
  //const lukutila: boolean = !!projekti.vuorovaikutusKierrosJulkaisut?.[vuorovaikutusKierros?.vuorovaikutusNumero || 0];

  return (
    <ProjektiPageLayout
      title="Suunnittelu"
      contentAsideTitle={<UusiVuorovaikutusNappi disabled={!kaikkiTilaisuudetMenneet} setDialogOpen={setDialogOpen} />}
    >
      <Section noDivider>
        {!julkinen && (
          <Notification type={NotificationType.INFO} hideIcon>
            <div>
              <h3 className="vayla-small-title">Ohjeet</h3>
              <ul className="list-disc block pl-5">
                <li>
                  Suunnitteluvaihe käsittää kansalaisille näytettäviä perustietoja suunnittelun etenemisestä sekä vuorovaikutustilaisuuksien
                  tiedot.
                </li>
                <li>
                  Suunnitteluvaiheen perustiedot -välilehdelle kirjataan kansalaisille suunnattua yleistä tietoa suunnitelmasta,
                  suunnittelun etenemisestä sekä aikatauluarvio. Perustiedot näkyvät kansalaisille palvelun julkisella puolella kutsun
                  julkaisun jälkeen.
                </li>
                <li>Suunnitteluvaiheen perustietoja pystyy muokkaamaan myös kutsun julkaisun jälkeen.</li>
                <li>Vuorovaikutustilaisuuksien tiedot lisätään kutsuun Kutsu vuorovaikutukseen -välilehdeltä.</li>
                <li>
                  Suunnitelma näkyy kansalaisille suunnitteluvaiheessa olevana kutsun julkaisusta nähtäville asettamisen kuulutuksen
                  julkaisuun asti.
                </li>
              </ul>
            </div>
          </Notification>
        )}
        {published && (
          <Notification type={NotificationType.INFO_GREEN}>
            Kutsu vuorovaikututilaisuuksiin on julkaistu {julkaisuPaiva}. Vuorovaikutustilaisuuksien tietoja pääsee muokkaamaan enää
            rajoitetusti..
          </Notification>
        )}
        {!published && (
          <Notification type={NotificationType.WARN}>
            Vuorovaikutusta ei ole vielä julkaistu palvelun julkisella puolella. Julkaisu {vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva}
            .
            {!vuorovaikutusKierros?.esittelyaineistot?.length && !vuorovaikutusKierros?.suunnitelmaluonnokset?.length
              ? " Huomaathan, että suunnitelma-aineistot tulee vielä lisätä."
              : ""}
          </Notification>
        )}

        <Tabs value={value}>
          {tabProps.map((tProps, index) => (
            <LinkTab key={index} {...tProps} />
          ))}
        </Tabs>
      </Section>
      <Dialog open={dialogOpen}>
        <DialogContent>Oletko varma?</DialogContent>
        <DialogActions>
          <Button onClick={luoUusiVuorovaikutus}>Joo</Button>
          <Button
            onClick={() => {
              setDialogOpen(false);
            }}
          >
            Peruuta
          </Button>
        </DialogActions>
      </Dialog>
      {children}
    </ProjektiPageLayout>
  );
}

function UusiVuorovaikutusNappi({
  disabled,
  setDialogOpen,
}: {
  disabled: boolean;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Button disabled={disabled} onClick={() => setDialogOpen(true)}>
      Luo uusi kutsu
    </Button>
  );
}
