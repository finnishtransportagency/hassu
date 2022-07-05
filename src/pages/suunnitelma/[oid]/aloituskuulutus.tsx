import React, { ReactElement } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import FormatDate from "@components/FormatDate";
import useTranslation from "next-translate/useTranslation";
import {
  AloitusKuulutusJulkaisuJulkinen,
  AloitusKuulutusTila,
  Kieli,
  ProjektiTyyppi,
} from "../../../../common/graphql/apiModel";
import ExtLink from "@components/ExtLink";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { PageProps } from "@pages/_app";
import Notification, { NotificationType } from "@components/notification/Notification";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "src/util/dateUtils";
import HassuStack from "@components/layout/HassuStack";
import useProjektiBreadcrumbsJulkinen from "src/hooks/useProjektiBreadcrumbsJulkinen";

function formatYhteystiedotText(kuulutus: AloitusKuulutusJulkaisuJulkinen) {
  const yhteystiedotList = kuulutus.yhteystiedot.map(
    (yt) =>
      yt.etunimi +
      " " +
      yt.sukunimi +
      ", puh. " +
      yt.puhelinnumero +
      ", " +
      yt.sahkoposti +
      " (" +
      yt.organisaatio +
      ")"
  );

  if (yhteystiedotList.length == 1) {
    return yhteystiedotList[0];
  } else {
    return (
      yhteystiedotList.slice(0, yhteystiedotList.length - 1).join(", ") +
      " ja " +
      yhteystiedotList[yhteystiedotList.length - 1]
    );
  }
}

export default function AloituskuulutusJulkinen({ setRouteLabels }: PageProps): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.aloitusKuulutusJulkaisut?.[0];
  const velho = kuulutus?.velho;
  const suunnittelusopimus = kuulutus?.suunnitteluSopimus;

  useProjektiBreadcrumbsJulkinen(setRouteLabels);

  if (!projekti || !velho || !kuulutus) {
    return <div />;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + velho.maakunnat.join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + velho.kunnat.join(", ");
  }
  const yhteystiedot = formatYhteystiedotText(kuulutus);
  const keyValueData: KeyValueData[] = [
    {
      header: t(`ui-otsikot.nahtavillaoloaika`),
      data: `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.siirtyySuunnitteluVaiheeseen)}`,
    },
    { header: t(`ui-otsikot.hankkeen_sijainti`), data: sijainti },
    { header: t(`ui-otsikot.suunnitelman_tyyppi`), data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  let aloituskuulutusPDFPath =
    kuulutus.aloituskuulutusPDFt?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]?.aloituskuulutusPDFPath;
  let kuulutusFileName = aloituskuulutusPDFPath?.replace(/.*\//, "").replace(/\.\w+$/, "");
  let kuulutusFileExt = aloituskuulutusPDFPath?.replace(/.*\./, "");

  if (kuulutus.tila == AloitusKuulutusTila.MIGROITU) {
    return (
      <ProjektiJulkinenPageLayout selectedStep={0} title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)}>
        <>
          <Section noDivider>
            <p>Suunnitelma on tuotu toisesta järjestelmästä, joten tiedoissa voi olla puutteita.</p>
          </Section>
        </>
      </ProjektiJulkinenPageLayout>
    );
  }

  return (
    <ProjektiJulkinenPageLayout selectedStep={0} title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)}>
      <>
        <Section noDivider>
          <KeyValueTable rows={keyValueData}></KeyValueTable>
          {velho.tyyppi !== ProjektiTyyppi.RATA && (
            <SectionContent>
              {suunnittelusopimus && (
                <p>
                  {suunnittelusopimus.kunta} ja{" "}
                  {velho.suunnittelustaVastaavaViranomainen
                    ? t(`vastaava-viranomainen.${velho.suunnittelustaVastaavaViranomainen}`)
                    : velho.tilaajaOrganisaatio}{" "}
                  {t(`info.ei-rata.aloittavat_yleissuunnitelman_laatimisen`)}
                </p>
              )}
              <p>
                {t(`info.ei-rata.kuulutus_on_julkaistu`)} <FormatDate date={kuulutus.kuulutusPaiva} />.{" "}
                {t(`info.ei-rata.asianosaisten_katsotaan_saaneen`)}
              </p>
              <p>{t(`info.ei-rata.suunnitelmasta_vastaavalla_on`)}</p>
            </SectionContent>
          )}
          {velho.tyyppi === ProjektiTyyppi.RATA && (
            <SectionContent>
              <p>
                {t(`info.rata.vaylavirasto_on_julkaissut`)} <FormatDate date={kuulutus.kuulutusPaiva} />.
              </p>
              <p>{t(`info.rata.asianosaisten_katsotaan_saaneen`)}</p>
              <p>{t(`info.rata.rataverkon_haltijalla_on`)}</p>
            </SectionContent>
          )}

          <h4 className="vayla-small-title">{t(`ui-otsikot.suunnitteluhankkeen_kuvaus`)}</h4>
          <SectionContent>
            <p>{kuulutus.hankkeenKuvaus?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]}</p>
          </SectionContent>
          <h4 className="vayla-small-title">{t(`ui-otsikot.asianosaisen_oikeudet`)}</h4>
          <Notification type={NotificationType.INFO} hideIcon>
            <SectionContent sx={{ padding: "1rem 1rem" }}>
              {velho.tyyppi !== ProjektiTyyppi.RATA && (
                <ul>
                  <li>{t(`info.ei-rata.kiinteiston_omistajilla_ja`)}</li>
                  <li>{t(`info.ei-rata.suunnittelun_edetessa_tullaan`)}</li>
                  <li>{t(`info.ei-rata.valmistuttuaan_suunnitelmat_asetetaan`)}</li>
                </ul>
              )}
              {velho.tyyppi === ProjektiTyyppi.RATA && (
                <ul>
                  <li>{t(`info.rata.kiinteston_omistajilla_ja`)}</li>
                  <li>{t(`info.rata.suunnittelun_edetessa_tullaan`)}</li>
                  <li>{t(`info.rata.valmistuttuaan_suunnitelmat_asetetaan`)}</li>
                </ul>
              )}
            </SectionContent>
          </Notification>
          <SectionContent>
            {velho.tyyppi !== ProjektiTyyppi.RATA && <p>{t(`info.ei-rata.vaylavirasto_kasittelee_suunnitelman`)}</p>}
            {velho.tyyppi === ProjektiTyyppi.RATA && <p>{t(`info.rata.vaylavirasto_kasittelee_suunnitelman`)}</p>}
          </SectionContent>
          <h4 className="vayla-small-title">{t(`ui-otsikot.yhteystiedot`)}</h4>
          <SectionContent>
            <p>
              {t(`ui-otsikot.lisatietoja_antavat`)} {yhteystiedot}
            </p>
          </SectionContent>
          <h4 className="vayla-small-title">{t(`ui-otsikot.ladattava_kuulutus`)}</h4>
          <SectionContent className="flex gap-4">
            <ExtLink href={aloituskuulutusPDFPath}>{kuulutusFileName}</ExtLink> ({kuulutusFileExt}) (
            <FormatDate date={kuulutus.kuulutusPaiva} />-
            <FormatDate date={kuulutus.siirtyySuunnitteluVaiheeseen} />)
          </SectionContent>
          {projekti.euRahoitus && <img src="/eu-logo.jpg" width={134} alt={t(`ui-kuvatekstit.eu_aluerahoitus`)} />}
          <SectionContent sx={{ marginTop: "2rem" }}>
            <HassuStack rowGap={0}>
              <ExtLink hideIcon href="https://www.vayla.fi/tietosuoja">
                {t(`ui-linkkitekstit.tutustu_osallistumismahdollisuuksiin`)}
              </ExtLink>
              <ExtLink hideIcon href="https://vayla.fi/suunnittelu-rakentaminen/hankkeiden-suunnittelu">
                {t(`ui-linkkitekstit.tutustu_hankesuunnitteluun`)}
              </ExtLink>
            </HassuStack>
          </SectionContent>
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
