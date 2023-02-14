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
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import EuLogo from "@components/projekti/common/EuLogo";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { splitFilePath } from "src/util/fileUtil";
import ExtLink from "@components/ExtLink";
import FormatDate from "@components/FormatDate";

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
    <ProjektiJulkinenPageLayout selectedStep={2} title="Kuulutus suunnitelman nähtäville asettamisesta">
      <>
        <Section noDivider>
          <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  ) : (
    <ProjektiJulkinenPageLayout selectedStep={2} title="Kuulutus suunnitelman nähtäville asettamisesta">
      <Section noDivider>
        <KeyValueTable rows={keyValueData}></KeyValueTable>
        {kuulutus.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
        <SectionContent>
          {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
            <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
          ))}
        </SectionContent>
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.suunnitteluhankkeen_kuvaus`)}</h4>
        <SectionContent>{kuulutus.hankkeenKuvaus?.[kieli]}</SectionContent>
        {kuulutusTekstit?.kuvausTekstit?.map((teksti) => (
          <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
        ))}
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.asianosaisen_oikeudet`)}</h4>
        <SectionContent>
          <Notification type={NotificationType.INFO} hideIcon>
            <SectionContent sx={{ padding: "1rem 1rem" }}>
              <ul>
                {kuulutusTekstit?.infoTekstit?.map((teksti) => (
                  <li key={pKey++}>{renderTextAsHTML(teksti)}</li>
                ))}
              </ul>
            </SectionContent>
          </Notification>
        </SectionContent>
        <KansalaisenAineistoNakyma
          projekti={projekti}
          kuulutus={kuulutus}
          uudelleenKuulutus={projekti.nahtavillaoloVaihe?.uudelleenKuulutus}
        />
        {isProjektiInNahtavillaoloVaihe && (
          <>
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
          </>
        )}
        <SectionContent>
          <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
        </SectionContent>
        <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.yhteystiedot`)}</h4>
        <SectionContent>
          <p>
            {t("common:lisatietoja_antavat", {
              count: kuulutus.yhteystiedot.length,
            })}
          </p>
          {kuulutus.yhteystiedot.map((yhteystieto, index) => (
            <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>
          ))}
        </SectionContent>
        <Section noDivider>
          <h5 className="vayla-smallest-title">{t("projekti:ui-otsikot.ladattava_kuulutus")}</h5>
          <SectionContent className="flex gap-4">
            <ExtLink className="file_download" href={nahtavillaoloKuulutusPDFPath.path}>
              {nahtavillaoloKuulutusPDFPath.fileName}
            </ExtLink>{" "}
            ({nahtavillaoloKuulutusPDFPath.fileExt}) (
            <FormatDate date={kuulutus.kuulutusPaiva} />)
          </SectionContent>
        </Section>
      </Section>
      <EuLogo projekti={projekti} />
    </ProjektiJulkinenPageLayout>
  );
}
