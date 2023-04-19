import { FieldError } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import {
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
  VuorovaikutusTilaisuusInput,
  VuorovaikutusTilaisuusJulkaisu,
  Kieli,
} from "@services/api";
import Section from "@components/layout/Section";
import React, { ReactElement, Dispatch, SetStateAction } from "react";
import Button from "@components/button/Button";
import dayjs from "dayjs";
import { formatDate } from "common/util/dateUtils";
import capitalize from "lodash/capitalize";
import useTranslation from "next-translate/useTranslation";
import StandardiYhteystiedotListana from "../../common/StandardiYhteystiedotListana";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { isAjansiirtoSallittu } from "src/util/isAjansiirtoSallittu";
import { ProjektiTestCommand } from "common/testUtil.dev";

interface Props {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuusJulkaisu[] | null;
  projekti: ProjektiLisatiedolla;
  setOpenVuorovaikutustilaisuus?: Dispatch<SetStateAction<boolean>>;
  isJulkaisuMostRecent: boolean;
  tilaisuudetError?: FieldError | undefined;
}

export default function VuorovaikutusMahdollisuudet({
  vuorovaikutusTilaisuudet,
  projekti,
  setOpenVuorovaikutustilaisuus,
  isJulkaisuMostRecent,
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
        <h4 className="vayla-small-title">Vuorovaikutustilaisuudet</h4>
        {setOpenVuorovaikutustilaisuus && (
          <>
            <p>
              Lisää vuorovaikutustilaisuudet suunnitelmalle. Erilaisia vuorovaikutusmahdollisuuksia ovat fyysiset, paikan päällä tapahtuvat
              tilaisuudet, online-tilaisuus tai soittoaika. Kutsun vuorovaikutuksen pystyy tallentamaan julkaistavaksi, kun suunnitelmalle
              on lisätty vähintään yksi vuorovaikutusmahdollisuus.
            </p>
            <p>Pystyt muokkaamaan vuorovaikutustilaisuuden tapahtumalinkkiä vaikuttamatta kutsun uudelleenlähetykseen.</p>
            {tilaisuudetError && <p className="text-red">{tilaisuudetError.message}</p>}
          </>
        )}
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
                        {!!tilaisuus.peruttu && <span className="text-red mr-2">PERUTTU </span>}
                        {tilaisuus.nimi ? capitalize(tilaisuus.nimi[Kieli.SUOMI]) : "Verkkotilaisuus"},{" "}
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
                        {!!tilaisuus.peruttu && <span className="text-red mr-2">PERUTTU </span>}
                        {tilaisuus.nimi ? capitalize(tilaisuus.nimi[Kieli.SUOMI]) : "Fyysinen tilaisuus"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Osoite:{" "}
                        {tilaisuus.paikka ? `${tilaisuus.paikka?.[Kieli.SUOMI]}, ` : ""}
                        {tilaisuus.osoite?.[Kieli.SUOMI]}, {tilaisuus.postinumero} {tilaisuus.postitoimipaikka?.[Kieli.SUOMI]}
                        {tilaisuus.Saapumisohjeet?.[Kieli.SUOMI] && <>, Saapumisohjeet: {tilaisuus.Saapumisohjeet[Kieli.SUOMI]}</>}
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
                            {!!tilaisuus.peruttu && <span className="text-red mr-2">PERUTTU </span>}
                            <span>
                              {tilaisuus.nimi ? capitalize(tilaisuus.nimi[Kieli.SUOMI]) : "Soittoaika"},{" "}
                              {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                              {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
                            </span>
                          </p>
                          <div className="pl-2">
                            <span>
                              {tilaisuus.yhteystiedot?.map((yhteystieto, index) => (
                                <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto as Yhteystieto, t)}</p>
                              ))}
                            </span>
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
                            {tilaisuus.nimi ? capitalize(tilaisuus.nimi[Kieli.SUOMI]) : "Soittoaika"},{" "}
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
          {isJulkaisuMostRecent && isAjansiirtoSallittu() && (
            <ButtonFlatWithIcon
              icon="history"
              onClick={(e) => {
                e.preventDefault();
                window.location.assign(ProjektiTestCommand.oid(projekti.oid).vuorovaikutusKierrosMenneisyyteen());
              }}
            >
              Siirrä tilaisuudet menneisyyteen (TESTAAJILLE)
            </ButtonFlatWithIcon>
          )}
          {setOpenVuorovaikutustilaisuus && (
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
          )}
        </SectionContent>
      </Section>
    </>
  );
}
