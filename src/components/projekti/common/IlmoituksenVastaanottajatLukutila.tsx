import React, { ReactElement } from "react";
import useTranslation from "next-translate/useTranslation";
import {
  HyvaksymisPaatosVaiheTila,
  IlmoituksenVastaanottajat as IlmoituksenVastaanottajatType,
  NahtavillaoloVaiheTila,
} from "@services/api";
import dayjs from "dayjs";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { kuntametadata } from "../../../../common/kuntametadata";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatType | null | undefined;
  julkaisunTila: HyvaksymisPaatosVaiheTila | NahtavillaoloVaiheTila | null | undefined;
  epaaktiivinen?: boolean;
}

export default function IlmoituksenVastaanottajat({
  epaaktiivinen = false,
  ilmoituksenVastaanottajat,
  julkaisunTila,
}: Props): ReactElement {
  const { t, lang } = useTranslation("commonFI");
  const isKuntia = !!ilmoituksenVastaanottajat?.kunnat;
  const isViranomaisia = !!ilmoituksenVastaanottajat?.viranomaiset;

  return (
    <Section>
      <SectionContent>
        <h5 className="vayla-small-title">Ilmoituksen vastaanottajat</h5>
        {!epaaktiivinen && (
          <>
            <>
              <p>
                Kuulutuksesta lähetetään sähköpostitse tiedote viranomaiselle sekä projektia koskeville kunnille. Kunnat on haettu
                Projektivelhosta. Jos tiedote pitää lähettää useammalle kuin yhdelle viranomaisorganisaatiolle, lisää uusi rivi Lisää uusi
                -painikkeella.
              </p>
              <p>Jos kuntatiedoissa on virhe, tee korjaus Projektivelhoon.</p>
            </>

            {(julkaisunTila === HyvaksymisPaatosVaiheTila.HYVAKSYTTY || julkaisunTila === NahtavillaoloVaiheTila.HYVAKSYTTY) && (
              <p>
                Ilmoitukset on lähetetty eteenpäin alla oleville viranomaisille ja kunnille. Jos ilmoituksen tila on ‘Ei lähetetty’,
                tarkasta sähköpostiosoite. Ota tarvittaessa yhteys pääkäyttäjään.
              </p>
            )}
          </>
        )}
      </SectionContent>
      <SectionContent>
        <div className="grid grid-cols-4 gap-x-6 mb-4">
          <h6 className="font-bold">Viranomaiset</h6>
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
                  <p className="odd:bg-white even:bg-grey">{viranomainen.lahetetty ? "Lähetetty" : "Ei lähetetty"}</p>
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
        <h6 className="font-bold">Kunnat</h6>
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
                  <p className={getStyleForRow(index)}>{kunta.lahetetty ? "Lahetetty" : "Ei lähetetty"}</p>
                  <p className={getStyleForRow(index)}>{kunta.lahetetty ? dayjs(kunta.lahetetty).format("DD.MM.YYYY HH:mm") : null}</p>
                </React.Fragment>
              ))}
            </>
          )}
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
