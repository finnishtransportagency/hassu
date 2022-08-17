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

export default function Hyvaksymispaatos(): ReactElement {
  const { t } = useTranslation();
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.hyvaksymisPaatosVaihe;
  const velho = kuulutus?.velho;
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
    <ProjektiJulkinenPageLayout selectedStep={4} title="Kuulutus suunnitelman hyväksymisestä">
      <Section noDivider>
        <KeyValueTable rows={keyValueData}></KeyValueTable>
      </Section>
      <Section>
        <Trans
          i18nKey="projekti:info.hyvaksytty.liikenne_ja_viestintavirasto_on_paatoksellaan"
          values={{
            hyvaksymisPaiva: "TODO",
            paatosNumero: "TODO",
            suunnitelmanNimi: velho.nimi,
            sijainti: sijainti,
          }}
          components={{ p: <p /> }}
        />
        <Trans
          i18nKey="projekti:info.hyvaksytty.paatos_ja_sen_perusteena_olevat"
          values={{
            nahtavillaoloaikavali: aikavali,
            linkki: "TODO",
            osoite: "TODO",
          }}
          components={{ p: <p />, b: <b />, a: <Link href={"TODO"} /> }}
        />
        <Trans
          i18nKey="projekti:info.hyvaksytty.kuulutus_on_julkaistu"
          values={{
            julkaisupaiva: formatDate(kuulutus.kuulutusPaiva),
          }}
          components={{ p: <p /> }}
        />
        <Trans
          i18nKey="projekti:info.hyvaksytty.tiedoksisaannin_katsotaan_tapahtuneet"
          values={{
            tiedoksiantopaiva: formatDate(tiedoksiantopaiva),
          }}
          components={{ p: <p /> }}
        />
      </Section>
      <Section>
        <h4 className="vayla-small-title">Asianosaisen oikeudet</h4>
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
    </ProjektiJulkinenPageLayout>
  );
}
