import React, { ReactElement } from "react";
import { formatDate } from "../../../util/dateUtils";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import useTranslation from "next-translate/useTranslation";
import KeyValueTable, { KeyValueData } from "../../KeyValueTable";
import Section from "../../layout/Section";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";
import Notification, { NotificationType } from "../../notification/Notification";
import KansalaisenAineistoNakyma from "../common/KansalaisenAineistoNakyma";
import { HyvaksymisPaatosVaiheJulkaisuJulkinen, Kieli } from "@services/api";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import FormatDate from "@components/FormatDate";
import SectionContent from "@components/layout/SectionContent";
import { splitFilePath } from "../../../util/fileUtil";
import { kuntametadata } from "../../../../common/kuntametadata";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";

interface Props {
  kuulutus: HyvaksymisPaatosVaiheJulkaisuJulkinen | null | undefined;
}

export default function HyvaksymispaatosTiedot({ kuulutus }: Props): ReactElement {
  const { t, lang } = useTranslation();
  const { data: projekti } = useProjektiJulkinen();
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();

  const hyvaksymisKuulutusPDFPath = kuulutus?.hyvaksymisPaatosVaihePDFt?.[kieli || Kieli.SUOMI]?.hyvaksymisKuulutusPDFPath;
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
      <Section noDivider>
        <KeyValueTable rows={keyValueData}></KeyValueTable>
        {kuulutus?.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
      </Section>
      <Section noDivider className="pb-6 mb-6">
        <div style={{ marginTop: "1rem" }}>
          {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
            <p style={{ marginTop: "inherit" }} key={pKey++}>
              {renderTextAsHTML(teksti)}
            </p>
          ))}
        </div>
      </Section>
      <Section noDivider>
        <h4 className="vayla-small-title">{t("projekti:ui-otsikot.asianosaisen_oikeudet")}</h4>
        <Notification hideIcon type={NotificationType.INFO}>
          {kuulutusTekstit?.infoTekstit?.map((teksti) => (
            <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
          ))}
        </Notification>
        <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
      </Section>
      <Section noDivider>
        <h4 className="vayla-small-title">{t("projekti:ui-otsikot.yhteystiedot")}</h4>
        <p>
          {t("common:lisatietoja_antavat", {
            count: kuulutus.yhteystiedot?.length,
          })}
        </p>
        {kuulutus.yhteystiedot?.map((yhteystieto, index) => (
          <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>
        ))}
      </Section>
      <Section noDivider>
        <h5 className="vayla-smallest-title">{t("projekti:ui-otsikot.paatos")}</h5>
        <Stack direction="column" rowGap={2}>
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
      <Section noDivider>
        <KansalaisenAineistoNakyma
          projekti={projekti}
          kuulutus={kuulutus}
          naytaAineistoPaivanaKuulutuksenJulkaisuPaiva
          uudelleenKuulutus={undefined}
        />
      </Section>
      <Section noDivider>
        <h5 className="vayla-smallest-title">{t("projekti:ui-otsikot.ladattava_kuulutus")}</h5>
        <SectionContent className="flex gap-4">
          {!hyvaksymisKuulutusPDFPath && "TODO palauta hyvaksymisPaatosVaihePDFt backendistä"}
          <ExtLink className="file_download" href={kutsuPdfPath.path}>
            {kutsuPdfPath.fileName}
          </ExtLink>{" "}
          ({kutsuPdfPath.fileExt}) (
          <FormatDate date={kuulutus.kuulutusPaiva} />)
        </SectionContent>
      </Section>
    </>
  );
}
