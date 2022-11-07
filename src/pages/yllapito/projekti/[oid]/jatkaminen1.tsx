import React, { useCallback, useState, VFC } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import Notification, { NotificationType } from "@components/notification/Notification";
import Tabs, { TabProps } from "@components/layout/tabs/Tabs";
import KuulutuksenTiedot from "@components/projekti/jatkopaatos1/kuulutuksenTiedot/index";
import PaatosAineistot from "@components/projekti/jatkopaatos1/aineistot/index";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { Link } from "@mui/material";
import { HyvaksymisPaatosVaiheTila } from "@services/api";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import TallentamattomiaMuutoksiaDialog from "@components/TallentamattomiaMuutoksiaDialog";
import Jatkopaatos1VaiheAineistotLukutila from "@components/projekti/lukutila/JatkoPaatos1VaiheAineistotLukutila";
import Lukunakyma from "@components/projekti/jatkopaatos1/kuulutuksenTiedot/Lukunakyma";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";

export default function Jatkopaatos1Wrapper() {
  return <ProjektiConsumer>{(projekti) => <Jatkopaatos1 projekti={projekti} />}</ProjektiConsumer>;
}

const Jatkopaatos1: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
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

  const kertaalleenLahetettyHyvaksyttavaksi = projekti?.jatkoPaatos1VaiheJulkaisut && projekti.jatkoPaatos1VaiheJulkaisut.length >= 1;

  const jatkopaatos1VaiheJulkaisu = projekti?.jatkoPaatos1VaiheJulkaisut
    ? projekti.jatkoPaatos1VaiheJulkaisut[projekti.jatkoPaatos1VaiheJulkaisut.length - 1]
    : null;

  let { kuulutusPaiva, published } = examineKuulutusPaiva(jatkopaatos1VaiheJulkaisu?.kuulutusPaiva);

  if (!projekti) {
    return <></>;
  }

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <ProjektiPageLayout title="Kuulutus hyväksymispäätöksen jatkamisesta">
      {!epaaktiivinen && !kertaalleenLahetettyHyvaksyttavaksi && (
        <Notification closable type={NotificationType.INFO} hideIcon>
          <div>
            <h3 className="vayla-small-title">Ohjeet</h3>
            <ul className="list-disc block pl-5">
              <li>Aloita lisäämällä päätökset ja sen liitteenä olevat aineistot kuulutuksen ensimmäiseltä välilehdeltä.</li>
              <li>Jatka täyttämään kuulutuksen perustiedot valitsemalla “Tallenna ja siirry kuulutukselle”.</li>
              <li>
                Anna päivämäärä, jolloin suunnitelman hyväksymispäätöksestä kuulutetaan. Kuulutus julkaistaan samana päivänä Valtion
                liikenneväylien suunnittelu -palvelun kansalaispuolella.
              </li>
              <li>
                Päätöksen päivän ja asiatunnus tulee{" "}
                <Link underline="none" href={`/yllapito/projekti/${projekti?.oid}/kasittelyntila`}>
                  Käsittelyn tila
                </Link>{" "}
                -sivulla.
              </li>
              <li>Valitse hallinto-oikeus, jolta muutoksenhakua voidaan hakea</li>
              <li>Valitse ja lisää kuulutuksessa esitettävät yhteystiedot ja ilmoituksen vastaanottajat.</li>
              <li>Esikatsele ja lähetä hyväksymispäätöksen kuulutus hyväksyttäväksi projektipäällikölle.</li>
            </ul>
          </div>
        </Notification>
      )}
      {!epaaktiivinen && (
        <Section noDivider>
          {!published && jatkopaatos1VaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
            <Notification type={NotificationType.WARN}>Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}.</Notification>
          )}
          {published && jatkopaatos1VaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY && (
            <Notification type={NotificationType.INFO_GREEN}>
              Kuulutus nähtäville asettamisesta on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen
              palvelun julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
              <FormatDate date={jatkopaatos1VaiheJulkaisu.kuulutusVaihePaattyyPaiva} />.
            </Notification>
          )}
          {jatkopaatos1VaiheJulkaisu && jatkopaatos1VaiheJulkaisu?.tila === HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA && (
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
                    epaaktiivinen && jatkopaatos1VaiheJulkaisu ? (
                      <Lukunakyma projekti={projekti} jatkoPaatos1VaiheJulkaisu={jatkopaatos1VaiheJulkaisu} />
                    ) : (
                      <KuulutuksenTiedot setIsDirty={setIsDirty} />
                    ),
                  tabId: "kuulutuksentiedot_luku_tab",
                },
                {
                  label: "Päätös ja liitteenä oleva aineisto",
                  content:
                    epaaktiivinen && jatkopaatos1VaiheJulkaisu ? (
                      <Jatkopaatos1VaiheAineistotLukutila oid={projekti.oid} jatkoPaatos1VaiheJulkaisu={jatkopaatos1VaiheJulkaisu} />
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
                    epaaktiivinen && jatkopaatos1VaiheJulkaisu ? (
                      <Lukunakyma projekti={projekti} jatkoPaatos1VaiheJulkaisu={jatkopaatos1VaiheJulkaisu} />
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
};
