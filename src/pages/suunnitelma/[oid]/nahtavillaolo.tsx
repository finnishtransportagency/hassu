import React, { ReactElement, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { PageProps } from "@pages/_app";
import useTranslation from "next-translate/useTranslation";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { formatDate } from "src/util/dateUtils";
import SectionContent from "@components/layout/SectionContent";
import { ProjektiTyyppi, Viranomainen } from "@services/api";
import FormatDate from "@components/FormatDate";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import Notification, { NotificationType } from "@components/notification/Notification";
import MuistutusLomakeDialogi from "@components/projekti/kansalaisnakyma/MuistutusLomakeDialogi";
import useProjektiBreadcrumbsJulkinen from "src/hooks/useProjektiBreadcrumbsJulkinen";
import Trans from "next-translate/Trans";
import KansalaisenAineistoNakyma from "@components/projekti/common/KansalaisenAineistoNakyma";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";

export default function Nahtavillaolo({ setRouteLabels }: PageProps): ReactElement {
  const { t } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.nahtavillaoloVaihe;

  const velho = projekti?.velho;
  const [muistutusLomakeOpen, setMuistutusLomakeOpen] = useState(false);

  useProjektiBreadcrumbsJulkinen(setRouteLabels);
  const kieli = useKansalaiskieli();

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

  const keyValueData: KeyValueData[] = [
    {
      header: t(`ui-otsikot.nahtavillaoloaika`),
      data: `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.kuulutusVaihePaattyyPaiva)}`,
    },
    { header: t(`ui-otsikot.hankkeen_sijainti`), data: sijainti },
    { header: t(`ui-otsikot.suunnitelman_tyyppi`), data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  const yhteystiedotListana = kuulutus.kuulutusYhteystiedot?.map((yhteystieto) => t("common:yhteystieto", yhteystieto)) || [];

  const vastaavaViranomainen = velho.suunnittelustaVastaavaViranomainen;

  return (
    <ProjektiJulkinenPageLayout selectedStep={2} title="Kuulutus suunnitelman nähtäville asettamisesta">
      <Section noDivider>
        <KeyValueTable rows={keyValueData}></KeyValueTable>
        {velho.tyyppi !== ProjektiTyyppi.RATA && (
          <SectionContent>
            <Trans
              i18nKey="projekti:info.nahtavillaolo.ei-rata.vaylavirasto_on_laatinut"
              values={{
                projektiNimi: projekti.velho.nimi,
                suunnitelmaTyyppiGenetiivi: t(`projekti-tyyppi-genetiivi.${velho.tyyppi}`).toLocaleLowerCase(),
              }}
              components={{ p: <p />, b: <b /> }}
            />
            <p>
              {t(`info.nahtavillaolo.ei-rata.kuulutus_julkaistu`)} <FormatDate date={kuulutus.kuulutusPaiva} />.{" "}
              {t(`info.nahtavillaolo.ei-rata.asianosaisten_katsotaan_saaneen`)}
            </p>
          </SectionContent>
        )}
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.suunnitteluhankkeen_kuvaus`)}</h4>
        <SectionContent>{kuulutus.hankkeenKuvaus?.[kieli]}</SectionContent>
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.asianosaisen_oikeudet`)}</h4>
        <SectionContent>
          <Notification type={NotificationType.INFO} hideIcon>
            <SectionContent sx={{ padding: "1rem 1rem" }}>
              {velho.tyyppi !== ProjektiTyyppi.RATA && (
                <ul>
                  <li>
                    {t(`info.nahtavillaolo.ei-rata.kiinteiston_omistajilla_ja`, {
                      viranomainen:
                        vastaavaViranomainen === Viranomainen.VAYLAVIRASTO ? t(`common:vaylavirastolle`) : t(`common:ely-keskukselle`),
                      url: window.location.href,
                    })}{" "}
                    {t(`info.nahtavillaolo.ei-rata.sahkopostilla_muistutus`)}
                  </li>
                </ul>
              )}
            </SectionContent>
          </Notification>
        </SectionContent>
        <KansalaisenAineistoNakyma projekti={projekti} kuulutus={kuulutus} />
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.muistutuksen_jattaminen`)}</h4>
        <SectionContent>
          <JataPalautettaNappi teksti={t("muistutuslomake.jata_muistutus")} onClick={() => setMuistutusLomakeOpen(true)} />
          <MuistutusLomakeDialogi
            nahtavillaolo={kuulutus}
            open={muistutusLomakeOpen}
            onClose={() => setMuistutusLomakeOpen(false)}
            projekti={projekti}
          />
        </SectionContent>
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.yhteystiedot`)}</h4>
        <SectionContent>
          <p>
            {/* {t(yhteystiedotListana.length > 1 ? "common:lisatietoja_antavat" : "common:lisatietoja_antaa", {
                yhteystiedot: yhteystiedotListana.join(", "),
              })} */}
            {t("common:lisatietoja_antavat", {
              yhteystiedot: yhteystiedotListana.join(", "),
              count: yhteystiedotListana.length,
            })}
            {/* TODO hae projektin suunnittelusopimustiedoista kun saatavilla julkisessa rajapinnassa
              {suunnittelusopimus && (
                <>
                  {` ${t("common:ja")} `}
                  {suunnittelusopimus.etunimi} {suunnittelusopimus.sukunimi} puh. {suunnittelusopimus.puhelinnumero}{" "}
                  {suunnittelusopimus.email} ({capitalize(suunnittelusopimus.kunta)}).
                </>
              )}
              */}
          </p>
        </SectionContent>
      </Section>
    </ProjektiJulkinenPageLayout>
  );
}
