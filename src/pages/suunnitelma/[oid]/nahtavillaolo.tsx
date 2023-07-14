import React, { ReactElement, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section2";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import useTranslation from "next-translate/useTranslation";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { formatDate } from "common/util/dateUtils";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Kieli, KuulutusJulkaisuTila, Status } from "@services/api";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import Notification, { NotificationType } from "@components/notification/Notification";
import MuistutusLomakeDialogi from "@components/projekti/kansalaisnakyma/MuistutusLomakeDialogi";
import KansalaisenAineistoNakyma from "@components/projekti/common/KansalaisenAineistoNakyma";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { kuntametadata } from "../../../../common/kuntametadata";
import EuLogo from "@components/projekti/common/EuLogo";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { Yhteystietokortti } from "./suunnittelu";
import SaameContent from "@components/projekti/kansalaisnakyma/SaameContent";
import { H3 } from "@components/Headings";
import { TiedostoLinkkiLista } from "@components/projekti/kansalaisnakyma/TiedostoLinkkiLista";

export default function Nahtavillaolo(): ReactElement {
  const { t, lang } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.nahtavillaoloVaihe;
  const SAAME_CONTENT_TEXTS = {
    otsikko: "Gulahus plána oaidninláhkai bidjamis",
    kappale1:
      "Sáhtát sáddet muittuhusa plánemis plána prošeaktaoaivámužžii. Plána oaidninláhkái biddjojuvvon materiálat leat siiddu vuolleravddas.",
  };

  const velho = projekti?.velho;
  const [muistutusLomakeOpen, setMuistutusLomakeOpen] = useState(false);

  const kieli = useKansalaiskieli();

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

  const nahtavillaoloKuulutusPDFPath = kuulutus.kuulutusPDF?.[kieli];

  return migroitu ? (
    <ProjektiJulkinenPageLayout selectedStep={Status.NAHTAVILLAOLO} title={t("asiakirja.kuulutus_nahtavillaolosta.otsikko")}>
      <Section noDivider>
        <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
        {kieli === Kieli.SUOMI && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && (
          <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
            Plána hálddahuslaš gieđahallan lea álgán ovdal Stáhta johtalusfávlliid plánen bálvalusa atnuiváldima, nuba diehtu bálvalusas ii
            leat oažžumis. Jus dus leat jearaldagat plánema muttuin, sáhtát leat oktavuođas plána prošeaktaoaivámužžii.
          </p>
        )}
      </Section>
    </ProjektiJulkinenPageLayout>
  ) : (
    <ProjektiJulkinenPageLayout
      selectedStep={Status.NAHTAVILLAOLO}
      title={t("asiakirja.kuulutus_nahtavillaolosta.otsikko")}
      saameContent={
        <SaameContent
          kielitiedot={projekti.kielitiedot}
          kuulutusPDF={kuulutus?.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kuulutusPDF}
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
          {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
            <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
          ))}
          {kuulutusTekstit?.kuvausTekstit?.map((teksti) => (
            <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
          ))}
        </ContentSpacer>

        <ContentSpacer>
          <H3 variant="h4">{t(`ui-otsikot.nahtavillaolo.suunnitteluhankkeen_kuvaus`)}</H3>
          <p>{kuulutus.hankkeenKuvaus?.[kieli]}</p>
        </ContentSpacer>

        <ContentSpacer>
          <H3 variant="h4">{t(`ui-otsikot.nahtavillaolo.asianosaisen_oikeudet`)}</H3>
          <Notification type={NotificationType.INFO} hideIcon>
            <ul>
              {kuulutusTekstit?.infoTekstit?.map((teksti) => (
                <li key={pKey++}>{renderTextAsHTML(teksti)}</li>
              ))}
            </ul>
          </Notification>
          <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
        </ContentSpacer>
        <KansalaisenAineistoNakyma
          projekti={projekti}
          kuulutus={kuulutus}
          uudelleenKuulutus={projekti.nahtavillaoloVaihe?.uudelleenKuulutus}
        />
        {isProjektiInNahtavillaoloVaihe && (
          <ContentSpacer>
            <H3 variant="h4">{t(`ui-otsikot.nahtavillaolo.muistutuksen_jattaminen`)}</H3>
            {/* Tämä tulee vasta myöhemmin kuten alla oleva info-laatikko */}
            {/* <FontAwesomeIcon color="rgb(0, 100, 175)" size="lg" icon="info-circle" type={NotificationType.INFO_GRAY} /> */}
            <p>
              <strong>{t("muistutuslomake.jata_muistutus_mennessa", { pvm: formatDate(kuulutus.muistutusoikeusPaattyyPaiva) })}</strong>
            </p>

            {/* Tämä tulee vasta myöhemmin */}
            {/* <Notification type={NotificationType.INFO_GRAY} className="mt-4" closable>
                  <p>{t("muistutuslomake.muistutus_info_1")}</p>
                  <p>{t("muistutuslomake.muistutus_info_2")}</p>
              </Notification> */}
            <JataPalautettaNappi teksti={t("muistutuslomake.jata_muistutus")} onClick={() => setMuistutusLomakeOpen(true)} />
            <MuistutusLomakeDialogi
              nahtavillaolo={kuulutus}
              open={muistutusLomakeOpen}
              onClose={() => setMuistutusLomakeOpen(false)}
              projekti={projekti}
            />
          </ContentSpacer>
        )}

        <ContentSpacer>
          <H3 variant="h4">{t(`ui-otsikot.nahtavillaolo.yhteystiedot`)}</H3>
          <p>
            {t("common:lisatietoja_antavat", {
              count: kuulutus.yhteystiedot.length,
            })}
          </p>
          {kuulutus.yhteystiedot.map((yhteystieto, index) => (
            <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
          ))}
        </ContentSpacer>

        <ContentSpacer>
          <H3 variant="h4">{t("projekti:ui-otsikot.ladattava_kuulutus")}</H3>
          {kuulutus.kuulutusPaiva && nahtavillaoloKuulutusPDFPath && (
            <TiedostoLinkkiLista tiedostot={[nahtavillaoloKuulutusPDFPath]} julkaisupaiva={kuulutus.kuulutusPaiva} />
          )}
        </ContentSpacer>
        <EuLogo projekti={projekti} />
      </Section>
    </ProjektiJulkinenPageLayout>
  );
}
