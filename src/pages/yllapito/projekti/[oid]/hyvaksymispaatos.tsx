import React, { ReactElement, useCallback, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import Notification, { NotificationType } from "@components/notification/Notification";
import Tabs, { TabProps } from "@components/layout/tabs/Tabs";
import KuulutuksenTiedot from "@components/projekti/hyvaksyminen/kuulutuksenTiedot/index";
import PaatosAineistot from "@components/projekti/hyvaksyminen/aineistot/index";
import { useProjekti } from "src/hooks/useProjekti";
import { Link } from "@mui/material";
import { HyvaksymisPaatosVaiheTila } from "@services/api";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import TallentamattomiaMuutoksiaDialog from "@components/TallentamattomiaMuutoksiaDialog";
import HyvaksymisVaiheAineistotLukutila from "@components/projekti/lukutila/HyvakysmisVaiheAineistotLukutila";
import Lukunakyma from "@components/projekti/hyvaksyminen/kuulutuksenTiedot/Lukunakyma";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

export default function Hyvaksymispaatos({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);
  const [currentTab, setCurrentTab] = useState<number | string>(0);
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedValue, setSelectedValue] = useState<number | string>(0);

  const handleClickClose = () => {
    setOpen(false);
  };

  const handleClickOk = useCallback(() => {
    setIsDirty(false);
    setCurrentTab(selectedValue);
    setOpen(false);
  }, [selectedValue, setIsDirty]);

  const handleChange: TabProps["onChange"] = (_event, value) => {
    if (isDirty) {
      setOpen(true);
      setSelectedValue(value);
    } else {
      setOpen(false);
      setCurrentTab(value);
    }
  };

  const { data: projekti } = useProjekti();

  const kertaalleenLahetettyHyvaksyttavaksi =
    projekti?.hyvaksymisPaatosVaiheJulkaisut && projekti.hyvaksymisPaatosVaiheJulkaisut.length >= 1;

  const hyvaksymisPaatosVaiheJulkaisu = projekti?.hyvaksymisPaatosVaiheJulkaisut
    ? projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1]
    : null;

  let { kuulutusPaiva, published } = examineKuulutusPaiva(hyvaksymisPaatosVaiheJulkaisu?.kuulutusPaiva);

  if (!projekti) {
    return <></>;
  }

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <ProjektiPageLayout title="Kuulutus hyväksymispäätöksestä">
      {!epaaktiivinen && !kertaalleenLahetettyHyvaksyttavaksi && (
        <Notification closable type={NotificationType.INFO} hideIcon>
          <div>
            <h3 className="vayla-small-title">Ohjeet</h3>
            <ul className="list-disc block pl-5">
              <li>Aloita lisäämällä päätös ja sen liitteenä olevat aineistot kuulutuksen ensimmäiseltä välilehdeltä.</li>
              <li>Jatka täyttämään kuulutuksen perustiedot valitsemalla &quot;Tallenna luonnos&quot;.</li>
              <li>
                Anna päivämäärä, jolloin suunnitelman hyväksymispäätöksestä kuulutetaan. Kuulutus julkaistaan samana päivänä Valtion
                liikenneväylien suunnittelu -palvelun kansalaispuolella.
              </li>
              <li>
                Pääkäyttäjä lisää projektille Liikenne- ja viestintäviraston päätöksen ja asianumeron{" "}
                <Link underline="none" href={`/yllapito/projekti/${projekti?.oid}/kasittelyntila`}>
                  Käsittelyn tila
                </Link>{" "}
                -sivulla.
              </li>
              <li>Valitse hallinto-oikeus, jolta muutoksenhakua voidaan hakea.</li>
              <li>Valitse ja lisää kuulutuksessa esitettävät yhteystiedot ja ilmoituksen vastaanottajat.</li>
              <li>Esikatsele ja lähetä hyväksymispäätöksen kuulutus hyväksyttäväksi projektipäällikölle.</li>
            </ul>
          </div>
        </Notification>
      )}
      {!epaaktiivinen && (
        <Section noDivider>
          {!published && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
            <Notification type={NotificationType.WARN}>Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}.</Notification>
          )}
          {published && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
            <Notification type={NotificationType.INFO_GREEN}>
              Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen
              palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
              <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
            </Notification>
          )}
          {hyvaksymisPaatosVaiheJulkaisu && hyvaksymisPaatosVaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA && (
            <Notification type={NotificationType.WARN}>
              Kuulutus nähtäville asettamisesta odottaa hyväksyntää. Tarkasta kuulutus ja a) hyväksy tai b) palauta kuulutus korjattavaksi,
              jos havaitset puutteita tai virheen.
            </Notification>
          )}
        </Section>
      )}
      <Tabs
        tabStyle="Underlined"
        value={currentTab}
        onChange={handleChange}
        tabs={
          kertaalleenLahetettyHyvaksyttavaksi
            ? [
                {
                  label: "Kuulutuksen tiedot",
                  content:
                    epaaktiivinen && hyvaksymisPaatosVaiheJulkaisu ? (
                      <Lukunakyma projekti={projekti} hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
                    ) : (
                      <KuulutuksenTiedot setIsDirty={setIsDirty} />
                    ),
                  tabId: "kuulutuksentiedot_luku_tab",
                },
                {
                  label: "Päätös ja liitteenä oleva aineisto",
                  content:
                    epaaktiivinen && hyvaksymisPaatosVaiheJulkaisu ? (
                      <HyvaksymisVaiheAineistotLukutila oid={projekti.oid} hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
                    ) : (
                      <PaatosAineistot setIsDirty={setIsDirty} />
                    ),
                  tabId: "aineisto_luku_tab",
                },
              ]
            : [
                {
                  label: "Päätös ja liitteenä oleva aineisto",
                  content: <PaatosAineistot setIsDirty={setIsDirty} />,
                  tabId: "aineisto_tab",
                },
                {
                  label: "Kuulutuksen tiedot",
                  content:
                    epaaktiivinen && hyvaksymisPaatosVaiheJulkaisu ? (
                      <Lukunakyma projekti={projekti} hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
                    ) : (
                      <KuulutuksenTiedot setIsDirty={setIsDirty} />
                    ),
                  tabId: "kuulutuksentiedot_tab",
                },
              ]
        }
      />
      <TallentamattomiaMuutoksiaDialog open={open} handleClickClose={handleClickClose} handleClickOk={handleClickOk} />
    </ProjektiPageLayout>
  );
}
