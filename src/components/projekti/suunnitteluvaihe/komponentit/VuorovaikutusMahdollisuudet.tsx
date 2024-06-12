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
import { formatDate } from "hassu-common/util/dateUtils";
import upperFirst from "lodash/upperFirst";
import useTranslation from "next-translate/useTranslation";
import StandardiYhteystiedotListana from "../../common/StandardiYhteystiedotListana";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "common/testUtil.dev";

interface Props {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] | VuorovaikutusTilaisuusJulkaisu[] | null;
  projekti: ProjektiLisatiedolla;
  setOpenVuorovaikutustilaisuus?: Dispatch<SetStateAction<boolean>>;
  showAjansiirtopainikkeet: boolean;
  tilaisuudetError?: FieldError | undefined;
}

export default function VuorovaikutusMahdollisuudet({
  vuorovaikutusTilaisuudet,
  projekti,
  setOpenVuorovaikutustilaisuus,
  showAjansiirtopainikkeet,
  tilaisuudetError,
}: Props): ReactElement {
  const { t } = useTranslation();

  const isVerkkotilaisuuksia = !!(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA
  );
  const isYleisotilaisuuksia = !!(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA
  );
  const isSoittoaikoja = !!(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])?.find(
    (t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA
  );

  return (
    <>
      <Section>
        <h2 className="vayla-title">Vuorovaikutustilaisuudet</h2>
        {setOpenVuorovaikutustilaisuus && (
          <>
            <p>
              Lisää vuorovaikutustilaisuudet suunnitelmalle. Erilaisia vuorovaikutusmahdollisuuksia ovat fyysiset, paikan päällä tapahtuvat
              yleisötilaisuudet, verkkotilaisuus tai soittoaika. Kutsun vuorovaikutuksen pystyy tallentamaan julkaistavaksi, kun
              suunnitelmalle on lisätty vähintään yksi vuorovaikutusmahdollisuus.
            </p>
            {tilaisuudetError && <p className="text-red">{tilaisuudetError.message}</p>}
          </>
        )}
        <SectionContent>
          {isVerkkotilaisuuksia && (
            <>
              <p>
                <b>Verkkotilaisuudet</b>
              </p>
              {(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])
                ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA)
                .map((tilaisuus, index) => {
                  return (
                    <div key={index}>
                      <p className="mb-0">
                        {!!tilaisuus.peruttu && <span className="text-red mr-2">PERUTTU </span>}
                        {tilaisuus.nimi ? upperFirst(tilaisuus.nimi[Kieli.SUOMI]) : "Verkkotilaisuus"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Linkki tilaisuuteen: {tilaisuus.linkki}
                      </p>
                      {tilaisuus.lisatiedot?.[Kieli.SUOMI] && <p>Lisätiedot: {tilaisuus.lisatiedot[Kieli.SUOMI]}</p>}
                    </div>
                  );
                })}
            </>
          )}
          {isYleisotilaisuuksia && (
            <>
              <p>
                <b>Yleisötilaisuudet</b>
              </p>
              {(vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])
                ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA)
                .map((tilaisuus, index) => {
                  return (
                    <div key={index}>
                      <p className="mb-0">
                        {!!tilaisuus.peruttu && <span className="text-red mr-2">PERUTTU </span>}
                        {tilaisuus.nimi ? upperFirst(tilaisuus.nimi[Kieli.SUOMI]) : "Yleisötilaisuus"},{" "}
                        {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, Osoite:{" "}
                        {tilaisuus.paikka ? `${tilaisuus.paikka?.[Kieli.SUOMI]}, ` : ""}
                        {tilaisuus.osoite?.[Kieli.SUOMI]}, {tilaisuus.postinumero} {tilaisuus.postitoimipaikka?.[Kieli.SUOMI]}
                      </p>
                      {tilaisuus.lisatiedot?.[Kieli.SUOMI] && <p>Lisätiedot: {tilaisuus.lisatiedot[Kieli.SUOMI]}</p>}
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
                              {tilaisuus.nimi ? upperFirst(tilaisuus.nimi[Kieli.SUOMI]) : "Soittoaika"},{" "}
                              {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                              {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
                            </span>
                          </p>
                          <div>
                            <span>
                              {tilaisuus.yhteystiedot?.map((yhteystieto, index) => (
                                <p className="mb-0" key={index}>
                                  {yhteystietoKansalaiselleTekstiksi("fi", yhteystieto as Yhteystieto, t)}
                                </p>
                              ))}
                            </span>
                          </div>
                          {tilaisuus.lisatiedot?.[Kieli.SUOMI] && <div>Lisätiedot: {tilaisuus.lisatiedot[Kieli.SUOMI]}</div>}
                        </div>
                      );
                    })
                : (vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[])
                    ?.filter((t) => t.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA)
                    .map((tilaisuus, index) => {
                      return (
                        <div key={index}>
                          <p className="mb-0">
                            {tilaisuus.nimi ? upperFirst(tilaisuus.nimi[Kieli.SUOMI]) : "Soittoaika"},{" "}
                            {t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                            {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
                          </p>
                          <div>
                            {tilaisuus.esitettavatYhteystiedot && (
                              <StandardiYhteystiedotListana projekti={projekti} standardiYhteystiedot={tilaisuus.esitettavatYhteystiedot} />
                            )}
                          </div>
                          {tilaisuus.lisatiedot?.[Kieli.SUOMI] && <div>Lisätiedot: {tilaisuus.lisatiedot[Kieli.SUOMI]}</div>}
                        </div>
                      );
                    })}
            </>
          )}
          {showAjansiirtopainikkeet && (
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
              {isYleisotilaisuuksia || isVerkkotilaisuuksia || isSoittoaikoja ? "Muokkaa tilaisuuksia" : "Lisää tilaisuus"}
            </Button>
          )}
        </SectionContent>
      </Section>
    </>
  );
}
