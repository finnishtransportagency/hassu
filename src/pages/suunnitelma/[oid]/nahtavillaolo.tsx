import React, { ReactElement, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import useTranslation from "next-translate/useTranslation";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { formatDate } from "src/util/dateUtils";
import SectionContent from "@components/layout/SectionContent";
import { KuulutusJulkaisuTila, Status } from "@services/api";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import Notification, { NotificationType } from "@components/notification/Notification";
import MuistutusLomakeDialogi from "@components/projekti/kansalaisnakyma/MuistutusLomakeDialogi";
import KansalaisenAineistoNakyma from "@components/projekti/common/KansalaisenAineistoNakyma";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { kuntametadata } from "../../../../common/kuntametadata";
import EuLogo from "@components/projekti/common/EuLogo";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { splitFilePath } from "src/util/fileUtil";
import ExtLink from "@components/ExtLink";
import FormatDate from "@components/FormatDate";
import { Yhteystietokortti } from "./suunnittelu";
import HassuStack from "@components/layout/HassuStack";

export default function Nahtavillaolo(): ReactElement {
  const { t, lang } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.nahtavillaoloVaihe;

  const velho = projekti?.velho;
  const [muistutusLomakeOpen, setMuistutusLomakeOpen] = useState(false);

  const kieli = useKansalaiskieli();

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

  const keyValueData: KeyValueData[] = [
    {
      header: t(`ui-otsikot.nahtavillaoloaika`),
      data: `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.kuulutusVaihePaattyyPaiva)}`,
    },
    { header: t(`ui-otsikot.hankkeen_sijainti`), data: sijainti },
    { header: t(`ui-otsikot.suunnitelman_tyyppi`), data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  const migroitu = kuulutus.tila == KuulutusJulkaisuTila.MIGROITU;

  const isProjektiInNahtavillaoloVaihe = projekti.status == Status.NAHTAVILLAOLO;

  const kuulutusTekstit = projekti.nahtavillaoloVaihe?.kuulutusTekstit;
  let pKey = 1;

  const nahtavillaoloKuulutusPDFPath = splitFilePath(kuulutus.kuulutusPDF?.[kieli] || undefined);

  return migroitu ? (
    <ProjektiJulkinenPageLayout selectedStep={2} title={t("asiakirja.kuulutus_nahtavillaolosta.otsikko")}>
      <>
        <Section noDivider>
          <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  ) : (
    <ProjektiJulkinenPageLayout selectedStep={2} title={t("asiakirja.kuulutus_nahtavillaolosta.otsikko")}>
      <Section noDivider className="mt-8">
        <KeyValueTable rows={keyValueData} kansalaisnakyma={true}></KeyValueTable>
        {kuulutus.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
        <SectionContent>
          {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
            <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
          ))}
          {kuulutusTekstit?.kuvausTekstit?.map((teksti) => (
            <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
          ))}
        </SectionContent>

        <SectionContent>
          <h3 className="vayla-subtitle">{t(`ui-otsikot.nahtavillaolo.suunnitteluhankkeen_kuvaus`)}</h3>
          <p>{kuulutus.hankkeenKuvaus?.[kieli]}</p>
        </SectionContent>

        <SectionContent className="mt-8">
          <h3 className="vayla-subtitle">{t(`ui-otsikot.nahtavillaolo.asianosaisen_oikeudet`)}</h3>
          <Notification type={NotificationType.INFO} hideIcon className="mt-6">
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
        </SectionContent>
        <KansalaisenAineistoNakyma
          projekti={projekti}
          kuulutus={kuulutus}
          uudelleenKuulutus={projekti.nahtavillaoloVaihe?.uudelleenKuulutus}
        />
        {isProjektiInNahtavillaoloVaihe && (
          <Section noDivider className="mt-10 mb-10">
            <SectionContent>
              <HassuStack direction={"row"} alignItems="baseline" columnGap="1rem">
                <h2 className="vayla-title">{t(`ui-otsikot.nahtavillaolo.muistutuksen_jattaminen`)}</h2>
                {/* Tämä tulee vasta myöhemmin kuten alla oleva info-laatikko
                <FontAwesomeIcon color="rgb(0, 100, 175)" size="lg" icon="info-circle" type={NotificationType.INFO_GRAY} /> */}
              </HassuStack>
              <p className="mt-0">
                <strong>{t("muistutuslomake.jata_muistutus_mennessa", { pvm: formatDate(kuulutus.muistutusoikeusPaattyyPaiva) })}</strong>
              </p>

              {/* Tämä tulee vasta myöhemmin
              <Notification type={NotificationType.INFO_GRAY} className="mt-4" closable={true}>
                <SectionContent sx={{ fontSize: "1rem" }}>
                  <p>{t("muistutuslomake.muistutus_info_1")}</p>
                  <p>{t("muistutuslomake.muistutus_info_2")}</p>
                </SectionContent>
              </Notification> */}
            </SectionContent>
            <SectionContent className="mt-10 mb-10">
              <JataPalautettaNappi teksti={t("muistutuslomake.jata_muistutus")} onClick={() => setMuistutusLomakeOpen(true)} />
              <MuistutusLomakeDialogi
                nahtavillaolo={kuulutus}
                open={muistutusLomakeOpen}
                onClose={() => setMuistutusLomakeOpen(false)}
                projekti={projekti}
              />
            </SectionContent>
          </Section>
        )}

        <SectionContent>
          <h2 className="vayla-title">{t("projekti:ui-otsikot.ladattava_kuulutus")}</h2>
          <p>
            <ExtLink className="file_download" href={nahtavillaoloKuulutusPDFPath.path} style={{ marginRight: "0.5rem" }}>
              {nahtavillaoloKuulutusPDFPath.fileName}
            </ExtLink>{" "}
            ({nahtavillaoloKuulutusPDFPath.fileExt}) (
            <FormatDate date={kuulutus.kuulutusPaiva} />)
          </p>
        </SectionContent>

        <SectionContent className="mt-8">
          <h2 className="vayla-title">{t(`ui-otsikot.nahtavillaolo.yhteystiedot`)}</h2>
          <p>
            {t("common:lisatietoja_antavat", {
              count: kuulutus.yhteystiedot.length,
            })}
          </p>
          {kuulutus.yhteystiedot.map((yhteystieto, index) => (
            <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
          ))}
        </SectionContent>
        <Section noDivider></Section>
      </Section>
      <EuLogo projekti={projekti} />
    </ProjektiJulkinenPageLayout>
  );
}
