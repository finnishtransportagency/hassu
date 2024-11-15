import React, { ReactElement } from "react";
import { formatDate } from "hassu-common/util/dateUtils";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import useTranslation from "next-translate/useTranslation";
import KeyValueTable, { KeyValueData } from "../../KeyValueTable";
import Section from "../../layout/Section2";
import Notification, { NotificationType } from "../../notification/Notification";
import KansalaisenAineistoNakyma from "../common/KansalaisenAineistoNakyma";
import { HyvaksymisPaatosVaiheJulkaisuJulkinen, Kieli, KuulutusJulkaisuTila } from "@services/api";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import ContentSpacer from "@components/layout/ContentSpacer";
import { kuntametadata } from "hassu-common/kuntametadata";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { Yhteystietokortti } from "@pages/suunnitelma/[oid]/suunnittelu";
import { H3 } from "@components/Headings";
import { AineistoLinkkiLista } from "./AineistoLinkkiLista";
import { TiedostoLinkkiLista } from "./TiedostoLinkkiLista";
import EuLogo from "../common/EuLogo";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { LiittyvatSuunnitelmat } from "@components/kansalainen/LiittyvatSuunnitelmat";

interface Props {
  kuulutus: HyvaksymisPaatosVaiheJulkaisuJulkinen | null | undefined;
  paatosTyyppi: PaatosTyyppi;
}

export default function HyvaksymispaatosTiedot({ kuulutus, paatosTyyppi }: Props): ReactElement {
  const { t, lang } = useTranslation();
  const { data: projekti } = useProjektiJulkinen();
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();

  const hyvaksymisKuulutusPDFPath = kuulutus?.kuulutusPDF?.[kieli];

  if (!projekti || !kuulutus || !velho) {
    return <></>;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + kuntametadata.namesForMaakuntaIds(velho.maakunnat, lang).join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + kuntametadata.namesForKuntaIds(velho.kunnat, lang).join(", ");
  }

  const aikavali = `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.kuulutusVaihePaattyyPaiva)}`;

  const keyValueData: KeyValueData[] = [
    {
      header: t(`projekti:ui-otsikot.nahtavillaoloaika`),
      data: aikavali,
    },
    { header: t(`projekti:ui-otsikot.hankkeen_sijainti`), data: sijainti },
    {
      header: t(`projekti:ui-otsikot.suunnitelman_tyyppi`),
      data: velho?.tyyppi && t(`projekti:projekti-tyyppi.${velho?.tyyppi}`),
    },
  ];

  const kuulutusTekstit =
    paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS
      ? projekti.hyvaksymisPaatosVaihe?.kuulutusTekstit
      : paatosTyyppi === PaatosTyyppi.JATKOPAATOS1
      ? projekti.jatkoPaatos1Vaihe?.kuulutusTekstit
      : projekti.jatkoPaatos2Vaihe?.kuulutusTekstit;

  if (kuulutus.tila == KuulutusJulkaisuTila.MIGROITU) {
    return (
      <Section noDivider>
        <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
        {kieli === Kieli.SUOMI && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && (
          <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
            Plána hálddahuslaš gieđahallan lea álgán ovdal Stáhta johtalusfávlliid plánen bálvalusa atnuiváldima, nuba diehtu bálvalusas ii
            leat oažžumis. Jus dus leat jearaldagat plánema muttuin, sáhtát leat oktavuođas plána prošeaktaoaivámužžii.
          </p>
        )}
      </Section>
    );
  }

  return (
    <Section noDivider>
      <KeyValueTable rows={keyValueData} kansalaisnakyma />
      <ContentSpacer>
        {kuulutus?.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && (
          <PreWrapParagraph>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</PreWrapParagraph>
        )}
        {kuulutusTekstit?.leipaTekstit?.map((teksti, index) => (
          <p key={index}>{renderTextAsHTML(teksti)}</p>
        ))}
      </ContentSpacer>
      {projekti.suunnitelmaJaettu?.length && <LiittyvatSuunnitelmat suunnitelmaJaettu={projekti.suunnitelmaJaettu} />}
      <ContentSpacer>
        <H3 variant="h4">{t("projekti:ui-otsikot.asianosaisen_oikeudet")}</H3>
        <Notification hideIcon type={NotificationType.INFO}>
          <ul>
            {kuulutusTekstit?.infoTekstit?.map((teksti, index) => (
              <li key={index}>{renderTextAsHTML(teksti)}</li>
            ))}
          </ul>
        </Notification>
        <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
      </ContentSpacer>
      <ContentSpacer>
        <H3 variant="h4">
          {t(paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS ? "projekti:ui-otsikot.paatos" : "projekti:ui-otsikot.paatosJaJatkopaatos")}
        </H3>
        {kuulutus?.hyvaksymisPaatos?.length && kuulutus?.kuulutusPaiva && (
          <AineistoLinkkiLista aineistot={kuulutus?.hyvaksymisPaatos} julkaisupaiva={kuulutus?.kuulutusPaiva} />
        )}
      </ContentSpacer>
      <KansalaisenAineistoNakyma projekti={projekti} kuulutus={kuulutus} uudelleenKuulutus={kuulutus.uudelleenKuulutus} paatos />
      <ContentSpacer>
        <H3 variant="h4">{t("projekti:ui-otsikot.yhteystiedot")}</H3>
        <p>
          {t("common:lisatietoja_antavat", {
            count: kuulutus.yhteystiedot?.length,
          })}
        </p>
        {kuulutus.yhteystiedot?.map((yhteystieto, index) => (
          <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
        ))}
      </ContentSpacer>
      <ContentSpacer>
        <H3 variant="h4">{t("projekti:ui-otsikot.ladattava_kuulutus")}</H3>
        {kuulutus.kuulutusPaiva && hyvaksymisKuulutusPDFPath && (
          <TiedostoLinkkiLista tiedostot={[hyvaksymisKuulutusPDFPath]} julkaisupaiva={kuulutus.kuulutusPaiva} />
        )}
      </ContentSpacer>
      <EuLogo projekti={projekti} />
    </Section>
  );
}
