import React, { ReactElement } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import useTranslation from "next-translate/useTranslation";
import { Kieli, KuulutusJulkaisuTila, Status } from "../../../../common/graphql/apiModel";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section2";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import Notification, { NotificationType } from "@components/notification/Notification";
import ContentSpacer from "@components/layout/ContentSpacer";
import { formatDate } from "common/util/dateUtils";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { kuntametadata } from "../../../../common/kuntametadata";
import EuLogo from "@components/projekti/common/EuLogo";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { Yhteystietokortti } from "./suunnittelu";
import SaameContent from "@components/projekti/kansalaisnakyma/SaameContent";
import HassuLink from "@components/HassuLink";
import { H3 } from "@components/Headings";
import { TiedostoLinkkiLista } from "@components/projekti/kansalaisnakyma/TiedostoLinkkiLista";

export default function AloituskuulutusJulkinen(): ReactElement {
  const { t, lang } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.aloitusKuulutusJulkaisu;
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();
  const SAAME_CONTENT_TEXTS = {
    otsikko: "Gulahus plánema álggaheamis",
    kappale1: (
      <p>
        Loga oassálastinvejolašvuođain{" "}
        <strong>
          <HassuLink style={{ color: "#0064af" }} useNextLink={true} href="/tietoa-palvelusta/tietoa-suunnittelusta">
            Diehtu plánemis -siidduin
          </HassuLink>
        </strong>
      </p>
    ),
  };

  if (!projekti || !velho || !kuulutus) {
    return <></>;
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

  const kuulutusPDF = kuulutus.kuulutusPDF?.[kieli];

  if (kuulutus.tila == KuulutusJulkaisuTila.MIGROITU) {
    return (
      <ProjektiJulkinenPageLayout selectedStep={Status.ALOITUSKUULUTUS} title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)}>
        <Section noDivider>
          <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
          {kieli === Kieli.SUOMI && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && (
            <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
              Plána hálddahuslaš gieđahallan lea álgán ovdal Stáhta johtalusfávlliid plánen bálvalusa atnuiváldima, nuba diehtu bálvalusas
              ii leat oažžumis. Jus dus leat jearaldagat plánema muttuin, sáhtát leat oktavuođas plána prošeaktaoaivámužžii.
            </p>
          )}
        </Section>
      </ProjektiJulkinenPageLayout>
    );
  }

  const kuulutusTekstit = kuulutus?.kuulutusTekstit;

  return (
    <ProjektiJulkinenPageLayout
      selectedStep={Status.ALOITUSKUULUTUS}
      title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)}
      saameContent={
        <SaameContent
          kielitiedot={projekti.kielitiedot}
          kuulutusPDF={kuulutus?.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusPDF}
          otsikko={SAAME_CONTENT_TEXTS.otsikko}
          kappale1={SAAME_CONTENT_TEXTS.kappale1}
        />
      }
      vahainenMenettely={projekti.vahainenMenettely}
    >
      <Section noDivider>
        <KeyValueTable rows={keyValueData} kansalaisnakyma />
        <ContentSpacer>
          {kuulutus.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
          {kuulutusTekstit?.leipaTekstit?.map((teksti, index) => (
            <p key={index}>{renderTextAsHTML(teksti)}</p>
          ))}
        </ContentSpacer>
        <ContentSpacer>
          <H3 variant="h4">{t(`ui-otsikot.suunnitteluhankkeen_kuvaus`)}</H3>
          <p>{kuulutus.hankkeenKuvaus?.[kieli]}</p>
          {kuulutusTekstit?.kuvausTekstit?.map((teksti, index) => (
            <p key={index}>{renderTextAsHTML(teksti)}</p>
          ))}
        </ContentSpacer>
        <H3 variant="h4">{t(`ui-otsikot.asianosaisen_oikeudet`)}</H3>
        <ContentSpacer>
          <Notification type={NotificationType.INFO} hideIcon role="presentation">
            <ul>
              {kuulutusTekstit?.infoTekstit?.map((teksti, index) => (
                <li key={index}>{renderTextAsHTML(teksti)}</li>
              ))}
            </ul>
          </Notification>
          <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
        </ContentSpacer>

        <ContentSpacer>
          <H3 variant="h4">{t(`ui-otsikot.yhteystiedot`)}</H3>
          <p>{t(`ui-otsikot.lisatietoja_antavat`)}</p>
          {kuulutus.yhteystiedot.map((yhteystieto, index) => (
            <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
          ))}
        </ContentSpacer>

        <ContentSpacer>
          <H3 variant="h4">{t(`ui-otsikot.ladattava_kuulutus`)}</H3>
          {kuulutus.kuulutusPaiva && kuulutusPDF && (
            <TiedostoLinkkiLista tiedostot={[kuulutusPDF]} julkaisupaiva={kuulutus.kuulutusPaiva} />
          )}
        </ContentSpacer>

        <EuLogo projekti={projekti} />
      </Section>
    </ProjektiJulkinenPageLayout>
  );
}
