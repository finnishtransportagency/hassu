import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import {
  Projekti,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
  YhteystietoInput,
  VuorovaikutusTilaisuusInput,
  Vuorovaikutus,
} from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, Dispatch, SetStateAction } from "react";
import Button from "@components/button/Button";

import dayjs from "dayjs";
import { formatDate } from "src/util/dateUtils";
import capitalize from "lodash/capitalize";
import useTranslation from "next-translate/useTranslation";

interface Props {
  projekti: Projekti;
  vuorovaikutus: Vuorovaikutus;
  setOpenVuorovaikutustilaisuus: Dispatch<SetStateAction<boolean>>;
}

type FormFields = {
  suunnitteluVaihe: {
    vuorovaikutus: {
      vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusInput> | null;
    };
  };
};

export default function SuunnitteluvaiheenVuorovaikuttaminen({
  projekti,
  vuorovaikutus,
  setOpenVuorovaikutustilaisuus,
}: Props): ReactElement {
  const { t } = useTranslation();

  const { getValues } = useFormContext<FormFields>();

  if (!projekti) {
    return <></>;
  }

  const vuorovaikutusTilaisuudet = vuorovaikutus.julkinen
    ? vuorovaikutus.vuorovaikutusTilaisuudet
    : getValues("suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet");

  const isVerkkotilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA
  );
  const isFyysisiatilaisuuksia = !!vuorovaikutusTilaisuudet?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA
  );
  const isSoittoaikoja = !!vuorovaikutusTilaisuudet?.find((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA);

  return (
    <>
      <Section>
        {vuorovaikutus.julkinen ? (
          <>
            <Button
              style={{ float: "right" }}
              onClick={(e) => {
                setOpenVuorovaikutustilaisuus(true);
                e.preventDefault();
              }}
            >
              Muokkaa
            </Button>
            <div className="pt-10">
              <p className="vayla-label">Vuorovaikutusmahdollisuudet palautteiden ja kysymyksien lisäksi</p>
              <p>
                Verkossa jaettavien tilaisuuksien liittymislinkit julkaistaan palvelun julkisella puolella kaksi (2)
                tuntia ennen tilaisuuden alkua.
              </p>
            </div>
          </>
        ) : (
          <h4 className="vayla-small-title">Vuorovaikutusmahdollisuudet palautteiden ja kysymyksien lisäksi</h4>
        )}
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
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)}{" "}
                        {formatDate(tilaisuus.paivamaara)} klo {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Linkki
                        tilaisuuteen: {tilaisuus.linkki}
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
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)}{" "}
                        {formatDate(tilaisuus.paivamaara)} klo {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika},
                        Osoite: {tilaisuus.paikka ? `${tilaisuus.paikka}, ` : ""}
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
                      <p>
                        {tilaisuus.nimi ? capitalize(tilaisuus.nimi) : "Soittoaika"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)}{" "}
                        {formatDate(tilaisuus.paivamaara)} klo {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
                      </p>
                      <div>
                        {tilaisuus.esitettavatYhteystiedot?.map((yhteystieto, index) => {
                          return <SoittoajanYhteystieto key={index} yhteystieto={yhteystieto} />;
                        })}
                      </div>
                    </div>
                  );
                })}
            </>
          )}
          {!vuorovaikutus.julkinen && (
            <Button
              onClick={(e) => {
                setOpenVuorovaikutustilaisuus(true);
                e.preventDefault();
              }}
              id="add_or_edit_tilaisuus"
            >
              {isFyysisiatilaisuuksia || isVerkkotilaisuuksia || isSoittoaikoja
                ? "Muokkaa tilaisuuksia"
                : "Lisää tilaisuus"}
            </Button>
          )}
        </SectionContent>
      </Section>
    </>
  );
}
export const SoittoajanYhteystieto = React.memo((props: { yhteystieto: Yhteystieto | YhteystietoInput }) => {
  return (
    <>
      <p>
        {props.yhteystieto.etunimi} {props.yhteystieto.sukunimi}
        {props.yhteystieto.titteli ? `, ${props.yhteystieto.titteli}` : null}
        {props.yhteystieto.organisaatio ? ` (${props.yhteystieto.organisaatio})` : null}:{" "}
        {props.yhteystieto.puhelinnumero}
      </p>
    </>
  );
});
SoittoajanYhteystieto.displayName = "SoittoajanYhteystieto";
