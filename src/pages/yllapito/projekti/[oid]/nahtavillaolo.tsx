import React, { ReactElement, useCallback, useState } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import Notification, { NotificationType } from "@components/notification/Notification";
import Tabs from "@components/layout/tabs/Tabs";
import KuulutuksenTiedot from "@components/projekti/nahtavillaolo/kuulutuksentiedot/KuulutuksenTiedot";
import NahtavilleAsetettavatAineistot from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/NahtavilleAsetettavatAineistot";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { NahtavillaoloVaiheTila, Status } from "@services/api";
import dayjs from "dayjs";
import SectionContent from "@components/layout/SectionContent";
import FormatDate from "@components/FormatDate";
import TallentamattomiaMuutoksiaDialog from "@components/TallentamattomiaMuutoksiaDialog";
import NahtavillaoloAineistotLukutila from "@components/projekti/lukutila/NahtavillaoloAineistotLukutila";
import Lukunakyma from "@components/projekti/nahtavillaolo/kuulutuksentiedot/Lukunakyma";

type Props2 = {
  projekti: ProjektiLisatiedolla;
};
function InfoElement({ projekti }: Props2) {
  const julkaisut = projekti?.nahtavillaoloVaiheJulkaisut;

  const julkaisu = julkaisut?.[julkaisut.length - 1];

  if (julkaisu?.tila === NahtavillaoloVaiheTila.HYVAKSYTTY) {
    // Toistaiseksi tarkastellaan julkaisupaivatietoa, koska ei ole olemassa erillista tilaa julkaistulle kuulutukselle
    const julkaisupvm = dayjs(julkaisu.kuulutusPaiva);
    if (dayjs().isBefore(julkaisupvm, "day")) {
      return (
        <Notification type={NotificationType.WARN}>
          {`Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä ${julkaisupvm.format("DD.MM.YYYY")}.`}
        </Notification>
      );
    } else {
      return (
        <Notification type={NotificationType.INFO_GREEN}>
          Kuulutus on julkaistu {julkaisupvm.format("DD.MM.YYYY")}. Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen palvelun
          julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy <FormatDate date={julkaisu.kuulutusVaihePaattyyPaiva} />.
        </Notification>
      );
    }
  } else if (julkaisu?.tila === NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA) {
    if (projekti?.nykyinenKayttaja.onProjektipaallikko || projekti?.nykyinenKayttaja.onYllapitaja) {
      return (
        <Notification type={NotificationType.WARN}>
          {
            "Kuulutus odottaa hyväksyntää. Tarkasta kuulutus ja a) hyväksy tai a) palauta kuulutus korjattavaksi, jos havaitset puutteita tai virheen."
          }
        </Notification>
      );
    } else {
      return (
        <Notification type={NotificationType.WARN}>
          Kuulutus on hyväksyttävänä projektipäälliköllä. Jos kuulutusta tarvitsee muokata, ota yhteys projektipäällikköön.
        </Notification>
      );
    }
  } else if (julkaisu?.tila === NahtavillaoloVaiheTila.PALAUTETTU) {
    return (
      <>
        {projekti?.nahtavillaoloVaihe?.palautusSyy && (
          <Notification type={NotificationType.WARN}>
            {"Aloituskuulutus on palautettu korjattavaksi. Palautuksen syy: " + projekti.nahtavillaoloVaihe.palautusSyy}
          </Notification>
        )}
      </>
    );
  } else {
    return <></>;
  }
}

export default function Nahtavillaolo({ setRouteLabels }: PageProps): ReactElement {
  const { data: projekti } = useProjekti();
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

  const handleChange = (_event: React.SyntheticEvent<Element, Event>, value: string | number) => {
    if (isDirty) {
      setOpen(true);
      setSelectedValue(value);
    } else {
      setOpen(false);
      setCurrentTab(value);
    }
  };

  if (!projekti) {
    return <></>;
  }

  const epaaktiivinen = projekti.status === Status.EPAAKTIIVINEN;

  const nahtavillaolovaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1];

  return (
    <ProjektiPageLayout title="Nähtävilläolovaihe">
      <SectionContent largeGaps>
        {!epaaktiivinen && (
          <>
            <InfoElement projekti={projekti} />
            <Notification type={NotificationType.INFO} hideIcon>
              <div>
                <h3 className="vayla-small-title">Ohjeet</h3>
                <ul className="list-disc block pl-5">
                  <li>Lisää nähtäville asetettavat aineistot sekä lausuntopyynnön lisäaineistot kuulutuksen ensimmäiseltä välilehdeltä.</li>
                  <li>Siirry Kuulutuksen tiedot-välilehdelle täyttämään kuulutuksen perustiedot.</li>
                  <li>
                    Anna päivämäärä, jolloin suunnittelun nähtäville asettamisesta kuulutetaan. Projekti ja sen nähtävilläolon kuulutus
                    julkaistaan samana päivänä Valtion liikenneväylien suunnittelu -palvelun kansalaispuolella.
                  </li>
                  <li>
                    Muokkaa tai täydennä halutessasi tiivistetty sisällönkuvaus hankkeesta. Jos projektista tulee tehdä kuulutus suomen
                    lisäksi toisella kielellä, eikä tälle ole kenttää, tarkista projektin tiedot -sivulta projektin kieliasetus.
                  </li>
                  <li>Valitse kuulutuksessa esitettävät yhteystiedot.</li>
                  <li>Lähetä nähtäville asettamisen kuulutus projektipäällikölle hyväksyttäväksi.</li>
                  <li>
                    {
                      "Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen palvelun julkisella puolella 'Hyväksyntämenettelyssä' -olevana."
                    }
                  </li>
                </ul>
              </div>
            </Notification>
          </>
        )}
        <Tabs
          tabStyle="Underlined"
          value={currentTab}
          onChange={handleChange}
          tabs={[
            {
              label: "Nähtäville asetettavat aineistot",
              content:
                epaaktiivinen && nahtavillaolovaiheJulkaisu ? (
                  <NahtavillaoloAineistotLukutila oid={projekti.oid} nahtavillaoloVaiheJulkaisu={nahtavillaolovaiheJulkaisu} />
                ) : (
                  <NahtavilleAsetettavatAineistot setIsDirty={setIsDirty} />
                ),
              tabId: "aineisto_tab",
            },
            {
              label: "Kuulutuksen tiedot",
              content:
                epaaktiivinen && nahtavillaolovaiheJulkaisu ? (
                  <Lukunakyma projekti={projekti} nahtavillaoloVaiheJulkaisu={nahtavillaolovaiheJulkaisu} />
                ) : (
                  <KuulutuksenTiedot setIsDirty={setIsDirty} />
                ),
              tabId: "kuulutuksentiedot_tab",
            },
          ]}
        />
      </SectionContent>
      <TallentamattomiaMuutoksiaDialog open={open} handleClickClose={handleClickClose} handleClickOk={handleClickOk} />
    </ProjektiPageLayout>
  );
}
