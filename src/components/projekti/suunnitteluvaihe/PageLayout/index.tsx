import React, { ReactElement, useMemo, ReactNode, useState, useCallback, VFC, Fragment } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { Dialog, DialogActions, DialogContent, IconButton, IconButtonProps, styled, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { UrlObject } from "url";
import { LinkTab, LinkTabProps } from "@components/layout/LinkTab";
import ProjektiConsumer from "../../ProjektiConsumer";
import Button from "@components/button/Button";
import {
  Kielitiedot,
  Linkki,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusJulkaisu,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import useApi from "src/hooks/useApi";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineJulkaisuPaiva, formatDate, formatDateLongWithTimeRange } from "../../../../../common/util/dateUtils";
import AddIcon from "@mui/icons-material/Add";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink from "@components/StyledLink";
import HassuDialog from "@components/HassuDialog";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import Section from "@components/layout/Section2";
import useTranslation from "next-translate/useTranslation";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";

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

  const openUusiKierrosDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeUusiKierrosDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const tabProps: LinkTabProps[] = useMemo(() => {
    const vuorovaikutusNumero: number = (projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0) + 1;

    const vuorovaikutusTab = {
      linkProps: {
        href: {
          pathname: `/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen`,
          query: { oid: projektiOid },
        },
      },
      label: `${vuorovaikutusNumero}. kutsu vuorovaikutukseen`,
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
        label: "Suunnitteluvaiheen perustiedot",
        disabled: false,
        id: "perustiedot_tab",
      },
      vuorovaikutusTab,
    ];
  }, [projekti.vuorovaikutusKierros?.vuorovaikutusNumero, projektiOid, disableTabs]);

  const pastVuorovaikutusKierrokset: VuorovaikutusKierrosJulkaisu[] = useMemo(() => {
    return (
      projekti.vuorovaikutusKierrosJulkaisut?.filter((julkaisu) => projekti.vuorovaikutusKierros?.vuorovaikutusNumero === julkaisu.id) || []
    );
  }, [projekti.vuorovaikutusKierros?.vuorovaikutusNumero, projekti.vuorovaikutusKierrosJulkaisut]);

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
        toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
      });
      showSuccessMessage("Uusi vuorovaikutuskierros luotu");
      await reloadProjekti();
    } catch (error) {
      showErrorMessage("Toiminto epäonnistui");
    }
    if (mounted) {
      closeUusiKierrosDialog();
    }
    return () => {
      mounted = false;
    };
  }, [api, closeUusiKierrosDialog, projekti, reloadProjekti, showErrorMessage, showSuccessMessage]);

  const { vuorovaikutusKierros } = projekti;
  const julkinen = vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN;
  const { julkaisuPaiva, published } = examineJulkaisuPaiva(julkinen, vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva);

  return (
    <ProjektiPageLayout title="Suunnittelu">
      <ContentSpacer sx={{ marginTop: 7 }} gap={7}>
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
            Kutsu vuorovaikutustilaisuuksiin on julkaistu {julkaisuPaiva}. Vuorovaikutustilaisuuksien tietoja pääsee muokkaamaan enää
            rajoitetusti.
          </Notification>
        )}
        {julkinen && !published && (
          <Notification type={NotificationType.WARN}>
            Vuorovaikutusta ei ole vielä julkaistu palvelun julkisella puolella. Julkaisu{" "}
            {formatDate(vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva)}.
            {!vuorovaikutusKierros?.esittelyaineistot?.length && !vuorovaikutusKierros?.suunnitelmaluonnokset?.length
              ? " Huomaathan, että suunnitelma-aineistot tulee vielä lisätä."
              : ""}
          </Notification>
        )}
        {!!pastVuorovaikutusKierrokset.length && (
          <ContentSpacer gap={2}>
            <p>
              <strong>Tutustu aiempiin vuorovaikutuksiin</strong>
            </p>
            <ContentSpacer as="ul" gap={2}>
              {pastVuorovaikutusKierrokset.map((julkaisu) => (
                <AiempiJulkaisuLinkki key={julkaisu.id} julkaisu={julkaisu} kielitiedot={projekti.kielitiedot} />
              ))}
            </ContentSpacer>
          </ContentSpacer>
        )}
        <Tabs value={value}>
          {tabProps.map((tProps, index) => (
            <LinkTab key={index} {...tProps} />
          ))}
          <UusiVuorovaikutusNappi disabled={!projekti.vuorovaikutusKierros?.saaLuodaUudenKierroksen} onClick={openUusiKierrosDialog} />
        </Tabs>
      </ContentSpacer>
      <Dialog open={dialogOpen}>
        <DialogContent>Oletko varma?</DialogContent>
        <DialogActions>
          <Button onClick={luoUusiVuorovaikutus}>Kyllä</Button>
          <Button onClick={closeUusiKierrosDialog}>Peruuta</Button>
        </DialogActions>
      </Dialog>
      {children}
    </ProjektiPageLayout>
  );
}

const AiempiJulkaisuLinkki: VFC<{ julkaisu: VuorovaikutusKierrosJulkaisu; kielitiedot: Kielitiedot | null | undefined }> = ({
  julkaisu,
  kielitiedot,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <li>
      <StyledLink as="button" sx={{ fontWeight: 400 }} onClick={openDialog}>
        {`${julkaisu.id + 1}. kutsu vuorovaikutukseen`}
      </StyledLink>
      {isDialogOpen && (
        <HassuDialog title={`${julkaisu.id + 1}. Vuorovaikuttaminen`} open={isDialogOpen} onClose={closeDialog}>
          <DialogContent>
            <Section marginTop={0}>
              <JulkaisuPaivaHankkeenkuvaus julkaisu={julkaisu} kielitiedot={kielitiedot} />
            </Section>
            <Section>
              <VuorovaikutusMahdollisuudet julkaisu={julkaisu} kielitiedot={kielitiedot} />
            </Section>
            <Section>
              <Aineistot julkaisu={julkaisu} kielitiedot={kielitiedot} />
            </Section>
            <Section>
              <Aineistot julkaisu={julkaisu} kielitiedot={kielitiedot} />
            </Section>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} primary>
              Sulje
            </Button>
          </DialogActions>
        </HassuDialog>
      )}
    </li>
  );
};

const P = styled("a")({});

const VuorovaikutusMahdollisuudet: VFC<{ julkaisu: VuorovaikutusKierrosJulkaisu; kielitiedot: Kielitiedot | null | undefined }> = ({
  julkaisu,
}) => {
  const { t } = useTranslation("suunnittelu");
  const tilaisuudetRyhmiteltyna: DefinitionList = useMemo(() => {
    const ryhmitellytTilaisuudet = julkaisu.vuorovaikutusTilaisuudet?.reduce<
      Record<VuorovaikutusTilaisuusTyyppi, VuorovaikutusTilaisuusJulkaisu[]>
    >(
      (ryhmitellytTilaisuudet, tilaisuus) => {
        ryhmitellytTilaisuudet[tilaisuus.tyyppi].push(tilaisuus);
        return ryhmitellytTilaisuudet;
      },
      { PAIKALLA: [], SOITTOAIKA: [], VERKOSSA: [] }
    ) || { PAIKALLA: [], SOITTOAIKA: [], VERKOSSA: [] };

    const definitions: DefinitionList = [];

    if (ryhmitellytTilaisuudet.VERKOSSA.length) {
      definitions.push({
        term: "Verkkotapahtumat",
        definition: (
          <>
            <p>
              Verkossa järjestettävien tilaisuuksien liittymislinkit julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen
              tilaisuuden alkua.
            </p>
            <ContentSpacer as="ul">
              {ryhmitellytTilaisuudet.VERKOSSA.map((tilaisuus) => (
                <li key={tilaisuus.id}>
                  {formatDateLongWithTimeRange(tilaisuus.paivamaara, tilaisuus.alkamisAika, tilaisuus.paattymisAika)}
                  {`, ${tilaisuus.nimi?.SUOMI}: `}
                  {tilaisuus.linkki && (
                    <StyledLink sx={{ fontWeight: 400 }} href={tilaisuus.linkki}>
                      {tilaisuus.linkki}
                    </StyledLink>
                  )}
                </li>
              ))}
            </ContentSpacer>
          </>
        ),
      });
    }
    if (ryhmitellytTilaisuudet.PAIKALLA.length) {
      definitions.push({
        term: "Yleisötilaisuudet",
        definition: (
          <ContentSpacer as="ul">
            {ryhmitellytTilaisuudet.PAIKALLA.map((tilaisuus) => (
              <li key={tilaisuus.id}>
                {formatDateLongWithTimeRange(tilaisuus.paivamaara, tilaisuus.alkamisAika, tilaisuus.paattymisAika)}
                {`, ${tilaisuus.nimi?.SUOMI}: `}
                {t(`tilaisuudet.paikalla.osoitetiedot`, {
                  osoite: tilaisuus.osoite?.SUOMI || "",
                  postinumero: tilaisuus.postinumero || "",
                  postitoimipaikka: tilaisuus.postitoimipaikka?.SUOMI || "",
                })}
                {tilaisuus.Saapumisohjeet?.SUOMI && `, ${tilaisuus.Saapumisohjeet?.SUOMI}`}
              </li>
            ))}
          </ContentSpacer>
        ),
      });
    }
    if (ryhmitellytTilaisuudet.SOITTOAIKA.length) {
      definitions.push({
        term: "Soittoajat",
        definition: (
          <ContentSpacer as="ul" sx={{ ul: { paddingLeft: 4, li: { display: "inline", marginLeft: -2 } } }}>
            {ryhmitellytTilaisuudet.SOITTOAIKA.map((tilaisuus) => (
              <li key={tilaisuus.id}>
                {formatDateLongWithTimeRange(tilaisuus.paivamaara, tilaisuus.alkamisAika, tilaisuus.paattymisAika)}
                {`, ${tilaisuus.nimi?.SUOMI}: `}
                <ul>
                  {tilaisuus.yhteystiedot
                    ?.filter((yhteystieto): yhteystieto is Yhteystieto => !!yhteystieto)
                    .map((yhteystieto, index) => {
                      return (
                        <li key={index}>
                          {yhteystietoKansalaiselleTekstiksi("fi", yhteystieto, t)}
                          <br />
                        </li>
                      );
                    })}
                </ul>
              </li>
            ))}
          </ContentSpacer>
        ),
      });
    }

    return definitions;
  }, [julkaisu.vuorovaikutusTilaisuudet, t]);

  return (
    <>
      <P sx={{ fontWeight: 700 }}>Vuorovaikutusmahdollisuudet</P>
      <StyledDefinitionList definitions={tilaisuudetRyhmiteltyna} />
    </>
  );
};

const Aineistot: VFC<{ julkaisu: VuorovaikutusKierrosJulkaisu; kielitiedot: Kielitiedot | null | undefined }> = ({
  julkaisu,
  kielitiedot,
}) => {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  const videolista: Linkki[] = useMemo(() => {
    return (
      julkaisu.videot?.reduce<Linkki[]>((acc, lokalisoituLinkki) => {
        const ensisijainenLinkki = ensisijainenKaannettavaKieli ? lokalisoituLinkki[ensisijainenKaannettavaKieli] : undefined;
        const toissijainenLinkki = toissijainenKaannettavaKieli ? lokalisoituLinkki[toissijainenKaannettavaKieli] : undefined;
        if (ensisijainenLinkki) {
          acc.push(ensisijainenLinkki);
        }
        if (toissijainenLinkki) {
          acc.push(toissijainenLinkki);
        }
        return acc;
      }, []) || []
    );
  }, [ensisijainenKaannettavaKieli, julkaisu.videot, toissijainenKaannettavaKieli]);

  const materiaalilinkit: Linkki[] = useMemo(() => {
    const linkit: Linkki[] = [];
    const ensisijainenLinkki = ensisijainenKaannettavaKieli ? julkaisu.suunnittelumateriaali?.[ensisijainenKaannettavaKieli] : undefined;
    const toissijainenLinkki = toissijainenKaannettavaKieli ? julkaisu.suunnittelumateriaali?.[toissijainenKaannettavaKieli] : undefined;
    if (ensisijainenLinkki) {
      linkit.push(ensisijainenLinkki);
    }
    if (toissijainenLinkki) {
      linkit.push(toissijainenLinkki);
    }
    return linkit;
  }, [ensisijainenKaannettavaKieli, julkaisu.suunnittelumateriaali, toissijainenKaannettavaKieli]);

  const aineistoDefinitions: DefinitionList = useMemo(
    () => [
      {
        term: "Suunnitelmaluonnokset ja esittelyaineistot",
        definition: (
          <ContentSpacer gap={7}>
            {videolista.length && (
              <ContentSpacer gap={2}>
                <p>Videoesittely</p>
                <ContentSpacer as="ul" gap={2}>
                  {videolista.map((video, index) => (
                    <li key={index}>
                      <StyledLink sx={{ fontWeight: 400 }} href={video.url}>
                        {video.nimi || video.url}
                      </StyledLink>
                    </li>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
            {julkaisu.esittelyaineistot?.length && (
              <ContentSpacer gap={2}>
                <p>Esittelyaineistot</p>
                <ContentSpacer as="ul" gap={2}>
                  {julkaisu.esittelyaineistot.map((aineisto) => (
                    <Fragment key={aineisto.dokumenttiOid}>
                      {aineisto.tiedosto && (
                        <li>
                          <StyledLink sx={{ fontWeight: 400 }} href={aineisto.tiedosto}>
                            {aineisto.nimi || aineisto.tiedosto}
                          </StyledLink>
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
            {julkaisu.suunnitelmaluonnokset?.length && (
              <ContentSpacer gap={2}>
                <p>Suunnitelmaluonnokset</p>
                <ContentSpacer as="ul" gap={2}>
                  {julkaisu.suunnitelmaluonnokset.map((aineisto) => (
                    <Fragment key={aineisto.dokumenttiOid}>
                      {aineisto.tiedosto && (
                        <li>
                          <StyledLink sx={{ fontWeight: 400 }} href={aineisto.tiedosto}>
                            {aineisto.nimi || aineisto.tiedosto}
                          </StyledLink>
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
            {materiaalilinkit.length && (
              <ContentSpacer gap={2}>
                <p>Muut esittelymateriaalit</p>
                <ContentSpacer as="ul" sx={{ ["& p"]: { marginBottom: 0 } }} gap={2}>
                  {materiaalilinkit.map((materiaalilinkki, index) => (
                    <li key={index}>
                      <p>{materiaalilinkki.nimi}</p>
                      <StyledLink sx={{ fontWeight: 400 }} href={materiaalilinkki.url}>
                        {materiaalilinkki.url}
                      </StyledLink>
                    </li>
                  ))}
                </ContentSpacer>
              </ContentSpacer>
            )}
          </ContentSpacer>
        ),
      },
    ],
    [julkaisu.esittelyaineistot, julkaisu.suunnitelmaluonnokset, materiaalilinkit, videolista]
  );
  return <StyledDefinitionList definitions={aineistoDefinitions} />;
};

const JulkaisuPaivaHankkeenkuvaus: VFC<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
  kielitiedot: Kielitiedot | null | undefined;
}> = ({ julkaisu, kielitiedot }) => {
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);
  const julkaisuPaivaHankkeenkuvausDefinitions: DefinitionList = useMemo(() => {
    const defs: DefinitionList = [
      {
        term: "Julkaisupäivä",
        definition: formatDate(julkaisu.vuorovaikutusJulkaisuPaiva),
      },
    ];
    if (ensisijainenKaannettavaKieli) {
      defs.push({
        term: `Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä (${ensisijainenKaannettavaKieli.toLowerCase()})`,
        definition: julkaisu.hankkeenKuvaus?.[ensisijainenKaannettavaKieli] || "",
      });
    }
    if (toissijainenKaannettavaKieli) {
      defs.push({
        term: `Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä (${toissijainenKaannettavaKieli.toLowerCase()})`,
        definition: julkaisu.hankkeenKuvaus?.[toissijainenKaannettavaKieli] || "",
      });
    }
    return defs;
  }, [ensisijainenKaannettavaKieli, julkaisu.hankkeenKuvaus, julkaisu.vuorovaikutusJulkaisuPaiva, toissijainenKaannettavaKieli]);

  return <StyledDefinitionList definitions={julkaisuPaivaHankkeenkuvausDefinitions} />;
};

type Definition = { term: string; definition: JSX.Element | string };
type DefinitionList = Definition[];

const StyledDefinitionList: VFC<{ definitions: DefinitionList }> = ({ definitions }) => {
  return (
    <ContentSpacer as="dl" sx={{ dt: { fontWeight: 700 }, dd: { marginBottom: 7 } }} gap={4}>
      {definitions.map(({ term, definition }) => (
        <Fragment key={term}>
          <dt>{term}</dt>
          <dd>{definition}</dd>
        </Fragment>
      ))}
    </ContentSpacer>
  );
};

function UusiVuorovaikutusNappi(props: IconButtonProps) {
  return (
    <IconButton {...props} type="button" sx={{ alignSelf: "center", marginLeft: "auto", border: "currentcolor solid 1px" }}>
      <AddIcon />
    </IconButton>
  );
}
