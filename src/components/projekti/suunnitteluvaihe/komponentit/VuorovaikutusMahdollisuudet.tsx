import { FieldError } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { VuorovaikutusTilaisuusTyyppi, Yhteystieto, VuorovaikutusTilaisuusInput, VuorovaikutusTilaisuusJulkaisu } from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, Dispatch, SetStateAction } from "react";
import Button from "@components/button/Button";
import dayjs from "dayjs";
import { formatDate } from "src/util/dateUtils";
import capitalize from "lodash/capitalize";
import useTranslation from "next-translate/useTranslation";
import StandardiYhteystiedotListana from "../../common/StandardiYhteystiedotListana";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";

interface Props {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuusJulkaisu[] | null;
  setOpenVuorovaikutustilaisuus: Dispatch<SetStateAction<boolean>>;
  projekti: ProjektiLisatiedolla;
  tilaisuudetError?: FieldError | undefined;
}

export default function VuorovaikutusMahdollisuudet({
  vuorovaikutusTilaisuudet,
  projekti,
  setOpenVuorovaikutustilaisuus,
  tilaisuudetError,
}: Props): ReactElement {
  const { t } = useTranslation();

  const isVerkkotilaisuuksia = !!(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA
  );
  const isFyysisiatilaisuuksia = !!(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA
  );
  const isSoittoaikoja = !!(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA
  );

  return (
    <>
      <Section>
        <>
          <h4 className="vayla-small-title">Vuorovaikutustilaisuudet</h4>
          {tilaisuudetError && <p className="text-red">{tilaisuudetError.message}</p>}
        </>
        <SectionContent>
          {isVerkkotilaisuuksia && (
            <>
              <p>
                <b>Live-tilaisuudet verkossa</b>
              </p>
              {(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])
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
              {(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])
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
              {/*
                Tätä komponenttia käytetään sekä muokkaustilaisen että lukutilaisen vuorovaikutuksen tilaisuuksien näyttämiseen.
                Soittoajan yhteystiedot ovat erilaiset niissä.
              */}
              {(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusJulkaisu[])?.find((tilaisuus) => !!tilaisuus.yhteystiedot)
                ? (vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusJulkaisu[])
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
                            {tilaisuus.yhteystiedot?.map((yhteystieto) => {
                              <p>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto as Yhteystieto)}</p>;
                            })}
                          </div>
                        </div>
                      );
                    })
                : (vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])
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
          <Button
            className="mt-8"
            onClick={(e) => {
              setOpenVuorovaikutustilaisuus(true);
              e.preventDefault();
            }}
            id="add_or_edit_tilaisuus"
          >
            {isFyysisiatilaisuuksia || isVerkkotilaisuuksia || isSoittoaikoja ? "Muokkaa" : "Lisää tilaisuus"}
          </Button>
        </SectionContent>
      </Section>
    </>
  );
}
