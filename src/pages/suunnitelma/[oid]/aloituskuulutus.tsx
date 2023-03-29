import React, { ReactElement, useMemo } from "react";
import { useProjektiJulkinen } from "../../../hooks/useProjektiJulkinen";
import FormatDate from "@components/FormatDate";
import useTranslation from "next-translate/useTranslation";
import { Kieli, KuulutusJulkaisuTila } from "../../../../common/graphql/apiModel";
import ExtLink from "@components/ExtLink";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import Notification, { NotificationType } from "@components/notification/Notification";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "src/util/dateUtils";
import { splitFilePath } from "../../../util/fileUtil";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { kuntametadata } from "../../../../common/kuntametadata";
import EuLogo from "@components/projekti/common/EuLogo";
import { renderTextAsHTML } from "../../../util/renderTextAsHTML";
import { Yhteystietokortti } from "./suunnittelu";
import HassuLink from "@components/HassuLink";

export default function AloituskuulutusJulkinen(): ReactElement {
  const { t, lang } = useTranslation("projekti");
  const { data: projekti } = useProjektiJulkinen();
  const kuulutus = projekti?.aloitusKuulutusJulkaisu;
  const velho = kuulutus?.velho;
  const kieli = useKansalaiskieli();

  const saameContent = useMemo(() => {
    if (projekti && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI) {
      const { path, fileExt, fileName } = splitFilePath(
        kuulutus?.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusPDF?.tiedosto || undefined
      );
      return (
        <div>
          <h2 className="vayla-small-title">Gulahus plánema álggaheamis</h2>
          {/* Kuulutus suunnittelun aloittamisesta */}
          <h3 className="vayla-label">{projekti.kielitiedot.projektinNimiVieraskielella}</h3>
          {path && (
            <p>
              <ExtLink className="file_download" href={path} style={{ marginRight: "0.5rem" }}>
                {fileName}
              </ExtLink>{" "}
              ({fileExt}) (
              <FormatDate date={kuulutus?.aloituskuulutusSaamePDFt?.POHJOISSAAME?.kuulutusPDF?.tuotu} />)
            </p>
          )}

          <p className="mt-2">
            Loga oassálastinvejolašvuođain{" "}
            <HassuLink className="text-primary" href="/tietoa-palvelusta/diehtu-planemis">
              Diehtu plánemis -siidduin
            </HassuLink>
            .{/*Lue osallistumismahdollisuuksista Tietoa suunnittelusta -sivulta.*/}
          </p>
        </div>
      );
    } else {
      return null;
    }
  }, [projekti, kieli, kuulutus]);

  if (!projekti || !velho || !kuulutus) {
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
      data: `${formatDate(kuulutus.kuulutusPaiva)} - ${formatDate(kuulutus.siirtyySuunnitteluVaiheeseen)}`,
    },
    { header: t(`ui-otsikot.hankkeen_sijainti`), data: sijainti },
    { header: t(`ui-otsikot.suunnitelman_tyyppi`), data: velho?.tyyppi && t(`projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  const aloituskuulutusPDFPath = splitFilePath(kuulutus.kuulutusPDF?.[kieli] || undefined);

  if (kuulutus.tila == KuulutusJulkaisuTila.MIGROITU) {
    return (
      <ProjektiJulkinenPageLayout selectedStep={0} title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)}>
        <>
          <Section noDivider>
            <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
            {kieli === Kieli.SUOMI && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && (
              <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
                Plána hálddahuslaš gieđahallan lea álgán ovdal Stáhta johtalusfávlliid plánen bálvalusa atnuiváldima, nuba diehtu bálvalusas
                ii leat oažžumis. Jus dus leat jearaldagat plánema muttuin, sáhtát leat oktavuođas plána prošeaktaoaivámužžii.
              </p>
            )}
          </Section>
        </>
      </ProjektiJulkinenPageLayout>
    );
  }

  const kuulutusTekstit = projekti.aloitusKuulutusJulkaisu?.kuulutusTekstit;
  let pKey = 1;

  return (
    <ProjektiJulkinenPageLayout selectedStep={0} title={t(`ui-otsikot.kuulutus_suunnitelman_alkamisesta`)} saameContent={saameContent}>
      <>
        <Section noDivider className="mt-8">
          <KeyValueTable rows={keyValueData} kansalaisnakyma={true}></KeyValueTable>
          {kuulutus.uudelleenKuulutus?.selosteKuulutukselle?.[kieli] && <p>{kuulutus.uudelleenKuulutus.selosteKuulutukselle[kieli]}</p>}
          <SectionContent sx={{ marginTop: "2rem" }}>
            {kuulutusTekstit?.leipaTekstit?.map((teksti) => (
              <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
            ))}
          </SectionContent>

          <h3 className="vayla-subtitle mt-6">{t(`ui-otsikot.suunnitteluhankkeen_kuvaus`)}</h3>
          <SectionContent sx={{ marginTop: "1rem" }}>
            <p>{kuulutus.hankkeenKuvaus?.[kieli]}</p>
            {kuulutusTekstit?.kuvausTekstit?.map((teksti) => (
              <p key={pKey++}>{renderTextAsHTML(teksti)}</p>
            ))}
          </SectionContent>
          <h3 className="vayla-subtitle mt-8">{t(`ui-otsikot.asianosaisen_oikeudet`)}</h3>
          <Notification type={NotificationType.INFO} hideIcon role="presentation" className="mt-6">
            {" "}
            {/* TODO: tarkista mita tarkoittaa designin viesti poista laatikointi */}
            <SectionContent sx={{ padding: "1rem 1rem", fontSize: "1rem" }}>
              <ul>
                {kuulutusTekstit?.infoTekstit?.map((teksti) => (
                  <li key={pKey++}>{renderTextAsHTML(teksti)}</li>
                ))}
              </ul>
            </SectionContent>
          </Notification>
          <SectionContent sx={{ marginTop: "2rem" }}>
            <p>{renderTextAsHTML(kuulutusTekstit?.tietosuoja)}</p>
          </SectionContent>

          <h2 className="vayla-title mt-8">{t(`ui-otsikot.ladattava_kuulutus`)}</h2>
          <SectionContent className="flex gap-4 mt-4">
            <ExtLink className="file_download" href={aloituskuulutusPDFPath.path}>
              {aloituskuulutusPDFPath.fileName}
            </ExtLink>{" "}
            ({aloituskuulutusPDFPath.fileExt}) (
            <FormatDate date={kuulutus.kuulutusPaiva} />-
            <FormatDate date={kuulutus.siirtyySuunnitteluVaiheeseen} />)
          </SectionContent>

          <h2 className="vayla-title mt-8">{t(`ui-otsikot.yhteystiedot`)}</h2>
          <SectionContent sx={{ marginTop: "1rem" }}>
            <p>{t(`ui-otsikot.lisatietoja_antavat`)}</p>
            {/* {kuulutus.yhteystiedot.map((yhteystieto, index) => (
              <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>
            ))} */}
            {kuulutus.yhteystiedot.map((yhteystieto, index) => (
              <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
            ))}
          </SectionContent>

          <EuLogo projekti={projekti} />
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
