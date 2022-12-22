import SectionContent from "@components/layout/SectionContent";
import { Projekti, VuorovaikutusTilaisuusTyyppi, Vuorovaikutus } from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import dayjs from "dayjs";
import { formatDate } from "src/util/dateUtils";
import capitalize from "lodash/capitalize";
import useTranslation from "next-translate/useTranslation";
import StandardiYhteystiedotListana from "../../common/StandardiYhteystiedotListana";

interface Props {
  projekti: Projekti;
  vuorovaikutus: Vuorovaikutus;
}

export default function VuorovaikutusMahdollisuudet({ projekti, vuorovaikutus }: Props): ReactElement {
  const { t } = useTranslation();

  if (!projekti) {
    return <></>;
  }

  const vuorovaikutusTilaisuudet = vuorovaikutus.vuorovaikutusTilaisuudet;

  const isVerkkotilaisuuksia = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA);
  const isFyysisiatilaisuuksia = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA);
  const isSoittoaikoja = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  return (
    <>
      <Section>
        <div className="pt-6">
          <p className="vayla-label">Vuorovaikutusmahdollisuudet palautteiden ja kysymyksien lisäksi</p>
          <p>
            Verkossa jaettavien tilaisuuksien liittymislinkit julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden
            alkua.
          </p>
        </div>
        <SectionContent>
          {isVerkkotilaisuuksia && (
            <>
              <p>
                <b>Live-tilaisuudet verkossa</b>
              </p>
              {vuorovaikutusTilaisuudet
                ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA)
                .map((tilaisuus, index) => {
                  return (
                    <div key={index}>
                      <p>
                        {tilaisuus.nimi ? capitalize(tilaisuus.nimi) : "Verkkotilaisuus"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Linkki tilaisuuteen: {tilaisuus.linkki}
                      </p>
                    </div>
                  );
                })}
            </>
          )}
          {isFyysisiatilaisuuksia && (
            <>
              <p>
                <b>Fyysiset tilaisuudet</b>
              </p>
              {vuorovaikutusTilaisuudet
                ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA)
                .map((tilaisuus, index) => {
                  return (
                    <div key={index}>
                      <p>
                        {tilaisuus.nimi ? capitalize(tilaisuus.nimi) : "Fyysinen tilaisuus"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Osoite: {tilaisuus.paikka ? `${tilaisuus.paikka}, ` : ""}
                        {tilaisuus.osoite}, {tilaisuus.postinumero} {tilaisuus.postitoimipaikka}
                        {tilaisuus.Saapumisohjeet && <>, Saapumisohjeet: {tilaisuus.Saapumisohjeet}</>}
                      </p>
                    </div>
                  );
                })}
            </>
          )}
          {isSoittoaikoja && (
            <>
              <p>
                <b>Soittoajat</b>
              </p>
              {vuorovaikutusTilaisuudet
                ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)
                .map((tilaisuus, index) => {
                  return (
                    <div key={index}>
                      <p className="mb-0">
                        {tilaisuus.nimi ? capitalize(tilaisuus.nimi) : "Soittoaika"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
                      </p>
                      <div className="pl-2">
                        {tilaisuus.esitettavatYhteystiedot && (
                          <StandardiYhteystiedotListana projekti={projekti} standardiYhteystiedot={tilaisuus.esitettavatYhteystiedot} />
                        )}
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </SectionContent>
      </Section>
    </>
  );
}
