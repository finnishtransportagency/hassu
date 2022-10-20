import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import { formatDate } from "src/util/dateUtils";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import useTranslation from "next-translate/useTranslation";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import Section from "@components/layout/Section";
import Trans from "next-translate/Trans";
import { Link } from "@mui/material";
import ExtLink from "@components/ExtLink";
import Notification, { NotificationType } from "@components/notification/Notification";
import { Stack } from "@mui/material";
import KansalaisenAineistoNakyma from "../../../components/projekti/common/KansalaisenAineistoNakyma";
import { kuntametadata } from "../../../../common/kuntametadata";

export default function Hyvaksymispaatos(): ReactElement {
  const { t, lang } = useTranslation();
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;
  const velho = kuulutus?.velho;
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

  const kuulutuspaiva = kuulutus.kuulutusPaiva ? new Date(kuulutus.kuulutusPaiva) : null;
  const tiedoksiantopaiva = kuulutuspaiva ? kuulutuspaiva.setDate(kuulutuspaiva.getDate() + 7) : null;

  const yhteystiedotListana = kuulutus?.yhteystiedot?.map((yhteystieto) => t("common:yhteystieto", yhteystieto)) || [];

  return (
    <ProjektiJulkinenPageLayout selectedStep={4} title={t("projekti:ui-otsikot.kuulutus_suunnitelman_hyvaksymisesta")}>
      <Section noDivider>
        <KeyValueTable rows={keyValueData}></KeyValueTable>
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
            yhteystiedot: yhteystiedotListana.join(", "),
            count: yhteystiedotListana.length,
          })}
        </p>
      </Section>
      <Section noDivider>
        <h5 className="vayla-smallest-title">{t("projekti:ui-otsikot.paatos")}</h5>
        <Stack direction="column" rowGap={2}>
          {kuulutus?.hyvaksymisPaatos &&
            kuulutus?.hyvaksymisPaatos.map((aineisto) => (
              <span key={aineisto.dokumenttiOid}>
                <ExtLink href={aineisto.tiedosto || ""} sx={{ mr: 3 }}>
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
        <KansalaisenAineistoNakyma projekti={projekti} kuulutus={kuulutus} naytaAineistoPaivanaKuulutuksenJulkaisuPaiva={true} />
      </Section>
      <Section noDivider>
        <h5 className="vayla-smallest-title">{t("projekti:ui-otsikot.ladattava_kuulutus")}</h5>
        TODO (toteuta kun pdf on toteutettu bäkissä)
      </Section>
    </ProjektiJulkinenPageLayout>
  );
}
