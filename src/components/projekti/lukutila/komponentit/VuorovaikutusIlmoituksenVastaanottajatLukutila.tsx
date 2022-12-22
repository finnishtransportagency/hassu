import React, { ReactElement, Fragment } from "react";
import { Vuorovaikutus } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import dayjs from "dayjs";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "../../../../../common/kuntametadata";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
}

export default function IlmoituksenVastaanottajatLukutila({ vuorovaikutus }: Props): ReactElement {
  const { t, lang } = useTranslation("commonFI");

  return (
    <Section>
      <h4 className="vayla-small-title">Ilmoituksen vastaanottajat</h4>
      <SectionContent>
        <p>
          Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on ‘Ei lähetetty’, tarkasta
          sähköpostiosoite. Ota tarvittaessa yhteys pääkäyttäjään.
        </p>
      </SectionContent>
      <SectionContent>
        <div className="grid grid-cols-4 gap-x-6 mb-4">
          <h6 className="font-bold">Viranomaiset</h6>
          <p></p>
          <p style={{ color: "#7A7A7A" }}>Ilmoituksen tila</p>
          <p style={{ color: "#7A7A7A" }}>Lähetysaika</p>

          {vuorovaikutus?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen, index) => (
            <React.Fragment key={index}>
              <p className="odd:bg-white even:bg-grey col-span-2">
                {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
              </p>
              <p className="odd:bg-white even:bg-grey">{viranomainen.lahetetty ? "Lähetetty" : "Ei lähetetty"}</p>
              <p className="odd:bg-white even:bg-grey">
                {viranomainen.lahetetty ? dayjs(viranomainen.lahetetty).format("DD.MM.YYYY HH:mm") : null}
              </p>
            </React.Fragment>
          ))}
        </div>
      </SectionContent>
      <SectionContent>
        <h6 className="font-bold">Kunnat</h6>
        <div className="content grid grid-cols-4 mb-4">
          <p className="vayla-table-header">Kunta</p>
          <p className="vayla-table-header">Sähköpostiosoite</p>
          <p className="vayla-table-header">Ilmoituksen tila</p>
          <p className="vayla-table-header">Lähetysaika</p>
          {vuorovaikutus?.ilmoituksenVastaanottajat?.kunnat?.map((kunta, index) => (
            <Fragment key={index}>
              <p className={getStyleForRow(index)}>{kuntametadata.nameForKuntaId(kunta.id, lang)}</p>
              <p className={getStyleForRow(index)}>{kunta.sahkoposti}</p>
              <p className={getStyleForRow(index)}>{kunta.lahetetty ? "Lahetetty" : "Ei lähetetty"}</p>
              <p className={getStyleForRow(index)}>{kunta.lahetetty ? dayjs(kunta.lahetetty).format("DD.MM.YYYY HH:mm") : null}</p>
            </Fragment>
          ))}
        </div>
      </SectionContent>
    </Section>
  );
}

function getStyleForRow(index: number): string | undefined {
  if (index % 2 == 0) {
    return "vayla-table-even";
  }
  return "vayla-table-odd";
}
