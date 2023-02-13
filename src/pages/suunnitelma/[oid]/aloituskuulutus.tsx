import React, { ReactElement } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import FormatDate from "@components/FormatDate";
import useTranslation from "next-translate/useTranslation";
import { Kieli, KuulutusJulkaisuTila, ProjektiVaihe } from "../../../../common/graphql/apiModel";
import ExtLink from "@components/ExtLink";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import Notification, { NotificationType } from "@components/notification/Notification";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "src/util/dateUtils";
import HassuStack from "@components/layout/HassuStack";
import { splitFilePath } from "../../../util/fileUtil";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { kuntametadata } from "../../../../common/kuntametadata";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";

export default function AloituskuulutusJulkinen(): ReactElement {
  const { t, lang } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen(ProjektiVaihe.ALOITUSKUULUTUS);
  const kuulutus = projekti?.aloitusKuulutusJulkaisu;
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();

  if (!projekti || !velho || !kuulutus) {
    return <div />;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + kuntametadata.namesForMaakuntaIds(velho.maakunnat, lang).join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + kuntametadata.namesForKuntaIds(velho.kunnat, lang).join(", ");
  }
  const keyValueData: KeyValueData[] = [
    {
      header: t(`ui-otsikot.nahtavillaoloaika`),
      data: `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.siirtyySuunnitteluVaiheeseen)}`,
    },
    { header: t(`ui-otsikot.hankkeen_sijainti`), data: sijainti },
    { header: t(`ui-otsikot.suunnitelman_tyyppi`), data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  const aloituskuulutusPDFPath = splitFilePath(
    kuulutus.aloituskuulutusPDFt?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]?.aloituskuulutusPDFPath
  );

  if (kuulutus.tila == KuulutusJulkaisuTila.MIGROITU) {
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

  const kuulutusTekstit = projekti.aloitusKuulutusJulkaisu?.kuulutusTekstit;
  let pKey = 1;

  return (
    <ProjektiJulkinenPageLayout selectedStep={0} title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)}>
      <>
        <Section noDivider>
          <KeyValueTable rows={keyValueData}></KeyValueTable>
          {kuulutus.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
          <SectionContent>
            {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
              <p key={pKey++}>{teksti}</p>
            ))}
          </SectionContent>

          <h4 className="vayla-small-title">{t(`ui-otsikot.suunnitteluhankkeen_kuvaus`)}</h4>
          <SectionContent>
            <p>{kuulutus.hankkeenKuvaus?.[kieli]}</p>
            {kuulutusTekstit?.kuvausTekstit?.map((teksti) => (
              <p key={pKey++}>{teksti}</p>
            ))}
          </SectionContent>
          <h4 className="vayla-small-title">{t(`ui-otsikot.asianosaisen_oikeudet`)}</h4>
          <Notification type={NotificationType.INFO} hideIcon>
            <SectionContent sx={{ padding: "1rem 1rem" }}>
              <ul>
                {kuulutusTekstit?.infoTekstit?.map((teksti) => (
                  <li key={pKey++}>{teksti}</li>
                ))}
              </ul>
            </SectionContent>
          </Notification>
          <SectionContent>
            <p>{kuulutusTekstit?.tietosuoja}</p>
          </SectionContent>
          <h4 className="vayla-small-title">{t(`ui-otsikot.yhteystiedot`)}</h4>
          <SectionContent>
            <p>{t(`ui-otsikot.lisatietoja_antavat`)}</p>
            {kuulutus.yhteystiedot.map((yhteystieto, index) => (
              <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>
            ))}
          </SectionContent>
          <h4 className="vayla-small-title">{t(`ui-otsikot.ladattava_kuulutus`)}</h4>
          <SectionContent className="flex gap-4">
            <ExtLink className="file_download" href={aloituskuulutusPDFPath.path}>
              {aloituskuulutusPDFPath.fileName}
            </ExtLink>{" "}
            ({aloituskuulutusPDFPath.fileExt}) (
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
