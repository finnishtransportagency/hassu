import React, { ReactElement } from "react";
import { formatDate } from "../../../../src/util/dateUtils";
import { useProjektiJulkinen } from "../../../../src/hooks/useProjektiJulkinen";
import useTranslation from "next-translate/useTranslation";
import KeyValueTable, { KeyValueData } from "../../KeyValueTable";
import Section from "../../layout/Section";
import Trans from "next-translate/Trans";
import { Link, Stack } from "@mui/material";
import ExtLink from "../../ExtLink";
import Notification, { NotificationType } from "../../notification/Notification";
import KansalaisenAineistoNakyma from "../common/KansalaisenAineistoNakyma";
import { HyvaksymisPaatosVaiheJulkaisuJulkinen, Kieli } from "@services/api";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import FormatDate from "@components/FormatDate";
import SectionContent from "@components/layout/SectionContent";
import { splitFilePath } from "../../../util/fileUtil";

interface Props {
  kuulutus: HyvaksymisPaatosVaiheJulkaisuJulkinen | null | undefined;
}
export default function HyvaksymispaatosTiedot({ kuulutus }: Props): ReactElement {
  const { t, lang } = useTranslation();
  const { data: projekti } = useProjektiJulkinen();
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();

  const hyvaksymisKuulutusPDFPath =
    kuulutus?.hyvaksymisPaatosVaihePDFt?.[kuulutus.kielitiedot?.ensisijainenKieli || Kieli.SUOMI]?.hyvaksymisKuulutusPDFPath;
  const hyvaksymisKuulutusPDFUrl = hyvaksymisKuulutusPDFPath ? "/" + hyvaksymisKuulutusPDFPath : "";
  const hyvaksymisKuulutusPDFFilename = hyvaksymisKuulutusPDFPath ? splitFilePath(hyvaksymisKuulutusPDFPath).fileName : "";
  const hyvaksymisKuulutusPDFFileExtension = hyvaksymisKuulutusPDFPath ? splitFilePath(hyvaksymisKuulutusPDFPath).fileExt : "";

  if (!projekti || !kuulutus || !velho) {
    return <div />;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + velho.maakunnat.join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + velho.kunnat.join(", ");
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

  const kuulutuspaiva = kuulutus.kuulutusPaiva ? new Date(kuulutus.kuulutusPaiva) : null;
  const tiedoksiantopaiva = kuulutuspaiva ? kuulutuspaiva.setDate(kuulutuspaiva.getDate() + 7) : null;

  return (
    <>
      <Section noDivider>
        <KeyValueTable rows={keyValueData}></KeyValueTable>
        {kuulutus?.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
      </Section>
      <Section noDivider className="pb-6 mb-6">
        <div style={{ marginTop: "1rem" }}>
          <Trans
            i18nKey="projekti:info.hyvaksytty.liikenne_ja_viestintavirasto_on_paatoksellaan"
            values={{
              hyvaksymisPaiva: kuulutus.hyvaksymisPaatoksenPvm,
              paatosNumero: kuulutus.hyvaksymisPaatoksenAsianumero,
              suunnitelmanNimi: velho.nimi,
              sijainti: sijainti,
            }}
            components={{ p: <p style={{ marginTop: "inherit" }} /> }}
          />
          <Trans
            i18nKey="projekti:info.hyvaksytty.paatos_ja_sen_perusteena_olevat"
            values={{
              nahtavillaoloaikavali: aikavali,
              linkki: "TODO linkki - missä?",
              osoite: "TODO osoite - missä?",
            }}
            components={{ p: <p style={{ marginTop: "inherit" }} />, b: <b />, a: <Link href={"TODO"} /> }}
          />
          <Trans
            i18nKey="projekti:info.hyvaksytty.kuulutus_on_julkaistu"
            values={{
              julkaisupaiva: formatDate(kuulutus.kuulutusPaiva),
            }}
            components={{ p: <p style={{ marginTop: "inherit" }} /> }}
          />
          <Trans
            i18nKey="projekti:info.hyvaksytty.tiedoksisaannin_katsotaan_tapahtuneet"
            values={{
              tiedoksiantopaiva: formatDate(tiedoksiantopaiva),
            }}
            components={{ p: <p style={{ marginTop: "inherit" }} /> }}
          />
        </div>
      </Section>
      <Section noDivider>
        <h4 className="vayla-small-title">{t("projekti:ui-otsikot.asianosaisen_oikeudet")}</h4>
        <Notification hideIcon type={NotificationType.INFO}>
          <p>
            <Trans
              i18nKey="projekti:info.hyvaksytty.paatokseen_voi_valittamalla"
              values={{
                hallintoOikeudelta: t(`common:hallinto-oikeus-ablatiivi.${kuulutus.hallintoOikeus}`),
              }}
            />
          </p>
        </Notification>
        <p>
          <Trans
            i18nKey="projekti:info.hyvaksytty.vaylavirasto_kasittelee_suunnitelman"
            values={{
              linkki: t("common:vayla-tietosuojasivu"),
            }}
            components={{ a: <ExtLink href={t("common:vayla-tietosuojasivu")} /> }}
          />
        </p>
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
          <ExtLink className="file_download" href={hyvaksymisKuulutusPDFUrl}>
            {hyvaksymisKuulutusPDFFilename}
          </ExtLink>{" "}
          ({hyvaksymisKuulutusPDFFileExtension}) (
          <FormatDate date={kuulutus.kuulutusPaiva} />)
        </SectionContent>
      </Section>
    </>
  );
}
