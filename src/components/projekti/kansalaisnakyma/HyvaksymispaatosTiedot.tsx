import React, { ReactElement } from "react";
import { formatDate } from "../../../../common/util/dateUtils";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import useTranslation from "next-translate/useTranslation";
import KeyValueTable, { KeyValueData } from "../../KeyValueTable";
import Section from "../../layout/Section";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";
import Notification, { NotificationType } from "../../notification/Notification";
import KansalaisenAineistoNakyma from "../common/KansalaisenAineistoNakyma";
import { HyvaksymisPaatosVaiheJulkaisuJulkinen } from "@services/api";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import FormatDate from "@components/FormatDate";
import SectionContent from "@components/layout/SectionContent";
import { splitFilePath } from "../../../util/fileUtil";
import { kuntametadata } from "../../../../common/kuntametadata";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { Yhteystietokortti } from "@pages/suunnitelma/[oid]/suunnittelu";

interface Props {
  kuulutus: HyvaksymisPaatosVaiheJulkaisuJulkinen | null | undefined;
}

export default function HyvaksymispaatosTiedot({ kuulutus }: Props): ReactElement {
  const { t, lang } = useTranslation();
  const { data: projekti } = useProjektiJulkinen();
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();

  const hyvaksymisKuulutusPDFPath = kuulutus?.kuulutusPDF?.[kieli] || undefined;
  const kutsuPdfPath = splitFilePath(hyvaksymisKuulutusPDFPath);

  if (!projekti || !kuulutus || !velho) {
    return <div />;
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

  const kuulutusTekstit = projekti.hyvaksymisPaatosVaihe?.kuulutusTekstit;
  let pKey = 1;

  return (
    <>
      <Section noDivider className="mt-8">
        <KeyValueTable rows={keyValueData} kansalaisnakyma={true}></KeyValueTable>
        {kuulutus?.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
      </Section>
      <Section noDivider className="mt-8">
        <div style={{ marginTop: "1rem" }}>
          {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
            <p style={{ marginTop: "inherit" }} key={pKey++}>
              {renderTextAsHTML(teksti)}
            </p>
          ))}
        </div>
      </Section>
      <Section noDivider className="mt-8">
        <h3 className="vayla-subtitle">{t("projekti:ui-otsikot.asianosaisen_oikeudet")}</h3>
        <Notification hideIcon type={NotificationType.INFO} className="mt-6">
          <SectionContent sx={{ padding: "1rem 1rem", fontSize: "1rem" }}>
            <ul>
              {kuulutusTekstit?.infoTekstit?.map((teksti) => (
                <li key={pKey++}>{renderTextAsHTML(teksti)}</li>
              ))}
            </ul>
          </SectionContent>
        </Notification>
        <SectionContent className="mt-8">
          <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
        </SectionContent>
      </Section>
      <Section noDivider className="mt-8">
        <h2 className="vayla-title">{t("projekti:ui-otsikot.paatos")}</h2>
        <Stack direction="column" rowGap={2} className="mt-4">
          {kuulutus?.hyvaksymisPaatos &&
            kuulutus?.hyvaksymisPaatos.map((aineisto) => (
              <span key={aineisto.dokumenttiOid}>
                <ExtLink className="file_download" href={aineisto.tiedosto || ""} sx={{ mr: 3 }}>
                  {aineisto.nimi}{" "}
                  <span className="text-black ml-2">
                    ({aineisto.nimi.split(".").pop()}) {formatDate(kuulutus?.kuulutusPaiva)}
                  </span>
                </ExtLink>
              </span>
            ))}
        </Stack>
      </Section>
      <Section noDivider className="mt-6">
        <KansalaisenAineistoNakyma
          projekti={projekti}
          kuulutus={kuulutus}
          naytaAineistoPaivanaKuulutuksenJulkaisuPaiva
          uudelleenKuulutus={undefined}
          paatos={true}
        />
      </Section>
      <Section noDivider className="mt-8">
        <h2 className="vayla-title">{t("projekti:ui-otsikot.ladattava_kuulutus")}</h2>
        <SectionContent className="flex gap-4 mt-4">
          <ExtLink className="file_download" href={kutsuPdfPath.path}>
            {kutsuPdfPath.fileName}
          </ExtLink>{" "}
          ({kutsuPdfPath.fileExt}) (
          <FormatDate date={kuulutus.kuulutusPaiva} />)
        </SectionContent>
      </Section>
      <Section noDivider className="mt-8">
        <SectionContent>
          <h2 className="vayla-title">{t("projekti:ui-otsikot.yhteystiedot")}</h2>
          <p>
            {t("common:lisatietoja_antavat", {
              count: kuulutus.yhteystiedot?.length,
            })}
          </p>
          {kuulutus.yhteystiedot?.map((yhteystieto, index) => (
            <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
          ))}
        </SectionContent>
      </Section>
    </>
  );
}
