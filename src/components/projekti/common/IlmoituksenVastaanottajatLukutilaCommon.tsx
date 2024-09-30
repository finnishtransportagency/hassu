import React, { ReactElement } from "react";
import useTranslation from "next-translate/useTranslation";
import { IlmoituksenVastaanottajat as IlmoituksenVastaanottajatType } from "@services/api";
import dayjs from "dayjs";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { kuntametadata } from "hassu-common/kuntametadata";
import { lahetysTila } from "../../../util/aloitusKuulutusUtil";
import { H3 } from "../../Headings";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatType | null | undefined;
}

export default function IlmoituksenVastaanottajat({ ilmoituksenVastaanottajat }: Readonly<Props>): ReactElement {
  const { t, lang } = useTranslation("commonFI");
  const isKuntia = !!ilmoituksenVastaanottajat?.kunnat;
  const isViranomaisia = !!ilmoituksenVastaanottajat?.viranomaiset;
  const isMaakuntia = ilmoituksenVastaanottajat?.maakunnat && ilmoituksenVastaanottajat.maakunnat.length > 0;
  return (
    <Section noDivider>
      <SectionContent>
        <div className="grid grid-cols-4 gap-x-6 mb-4">
          <H3 variant="h5">Viranomaiset</H3>
          <p></p>
          <p style={{ color: "#7A7A7A" }}>Ilmoituksen tila</p>
          <p style={{ color: "#7A7A7A" }}>Lähetysaika</p>
          {isViranomaisia && (
            <>
              {ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen, index) => (
                <React.Fragment key={index}>
                  <p className="odd:bg-white even:bg-grey col-span-2">
                    {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                  </p>
                  <p className="odd:bg-white even:bg-grey">{lahetysTila(viranomainen)}</p>
                  <p className="odd:bg-white even:bg-grey">
                    {viranomainen.lahetetty ? dayjs(viranomainen.lahetetty).format("DD.MM.YYYY HH:mm") : null}
                  </p>
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      </SectionContent>
      <SectionContent>
        <H3 variant="h5">Kunnat</H3>
        <div className="content grid grid-cols-4 mb-4">
          <p className="vayla-table-header">Kunta</p>
          <p className="vayla-table-header">Sähköpostiosoite</p>
          <p className="vayla-table-header">Ilmoituksen tila</p>
          <p className="vayla-table-header">Lähetysaika</p>
          {isKuntia && (
            <>
              {ilmoituksenVastaanottajat?.kunnat?.map((kunta, index) => (
                <React.Fragment key={index}>
                  <p className={getStyleForRow(index)}>{kuntametadata.nameForKuntaId(kunta.id, lang)}</p>
                  <p className={getStyleForRow(index)}>{kunta.sahkoposti}</p>
                  <p className={getStyleForRow(index)}>{kunta.lahetetty ? "Lähetetty" : "Ei lähetetty"}</p>
                  <p className={getStyleForRow(index)}>{kunta.lahetetty ? dayjs(kunta.lahetetty).format("DD.MM.YYYY HH:mm") : null}</p>
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      </SectionContent>
      {isMaakuntia && (
        <SectionContent>
          <H3 variant="h5">Maakunnat</H3>
          <div className="content grid grid-cols-4 mb-4">
            <p className="vayla-table-header">Maakunta</p>
            <p className="vayla-table-header">Sähköpostiosoite</p>
            <p className="vayla-table-header">Ilmoituksen tila</p>
            <p className="vayla-table-header">Lähetysaika</p>
            <>
              {ilmoituksenVastaanottajat?.maakunnat?.map((maakunta, index) => (
                <React.Fragment key={index}>
                  <p className={getStyleForRow(index)}>{kuntametadata.nameForMaakuntaId(maakunta.id, lang)}</p>
                  <p className={getStyleForRow(index)}>{maakunta.sahkoposti}</p>
                  <p className={getStyleForRow(index)}>{maakunta.lahetetty ? "Lähetetty" : "Ei lähetetty"}</p>
                  <p className={getStyleForRow(index)}>
                    {maakunta.lahetetty ? dayjs(maakunta.lahetetty).format("DD.MM.YYYY HH:mm") : null}
                  </p>
                </React.Fragment>
              ))}
            </>
          </div>
        </SectionContent>
      )}
    </Section>
  );
}
function getStyleForRow(index: number): string | undefined {
  if (index % 2 == 0) {
    return "vayla-table-even";
  }
  return "vayla-table-odd";
}
