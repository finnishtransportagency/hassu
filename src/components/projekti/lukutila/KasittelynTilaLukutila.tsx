import React, { ReactElement } from "react";
import Section from "@components/layout/Section";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useTranslation from "next-translate/useTranslation";
import { formatDateIfExistsAndValidOtherwiseDash } from "hassu-common/util/dateUtils";
import ContentSpacer from "@components/layout/ContentSpacer";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { H3 } from "../../Headings";

interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function KasittelynTilaLukutila({ projekti }: Readonly<Props>): ReactElement {
  const { t } = useTranslation("projekti");

  return (
    <>
      <Section noDivider>
        <p>
          Pääkäyttäjä lisää sivulle tietoa hallinnollisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa muille järjestelmän
          käyttäjille
        </p>
      </Section>
      <Section>
        <H3 className="vayla-title">Suunnitelman tila</H3>
        <p>Suunnitelman tilatieto siirtyy automaattisesti Projektivelhoon</p>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Suunnitelman tila</p>
          <p className="md:col-span-1 mb-0">{t(`projekti:projekti-status.${projekti.status}`)}</p>
        </div>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Hyväksymiskäsittelyn tila</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Ennakkotarkistus</p>
          <p className="vayla-label md:col-span-3">Ennakkoneuvottelu</p>
          <p className="md:col-span-1 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.ennakkotarkastus)}</p>
          <p className="md:col-span-3 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.ennakkoneuvotteluPaiva)}</p>
        </div>
        <div>
          <p className="vayla-label md:col-span-4">Hyväksymisesitys Traficomiin</p>
          <p className="md:col-span-4 mb-0">
            {formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.hyvaksymisesitysTraficomiinPaiva)}
          </p>
        </div>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Hyväksymispäätös</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Päätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Asiatunnus</p>
          <p className="md:col-span-1 mb-0">
            {formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm)}
          </p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.hyvaksymispaatos?.asianumero || "-"}</p>
        </div>
        <div>
          <p className="vayla-label md:col-span-4">Valitusten lukumäärä</p>
          <p className="md:col-span-4 mb-0">
            {!projekti.kasittelynTila?.valitustenMaara ? "Ei" : `Kyllä, ${projekti.kasittelynTila?.valitustenMaara} kpl`}
          </p>
        </div>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Lainvoima</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Lainvoima alkaen</p>
          <p className="vayla-label md:col-span-3">Lainvoima päättyen</p>
          <p className="md:col-span-1 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.lainvoimaAlkaen)}</p>
          <p className="md:col-span-3 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.lainvoimaPaattyen)}</p>
        </div>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Väylätoimitus</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Toimitus käynnistynyt</p>
          <p className="md:col-span-4 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.toimitusKaynnistynyt)}</p>
        </div>
        <h3 className="vayla-subtitle">Liikenteelleluovutus</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Osaluovutus</p>
          <p className="md:col-span-4 mb-0">
            {formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.liikenteeseenluovutusOsittain)}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Kokoluovutus</p>
          <p className="md:col-span-4 mb-0">
            {formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.liikenteeseenluovutusKokonaan)}
          </p>
        </div>
        <h3 className="vayla-subtitle">Ratasuunnitelman toteutusilmoitus</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Osatoteutus</p>
          <p className="md:col-span-4 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.toteutusilmoitusOsittain)}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Kokototeutus</p>
          <p className="md:col-span-4 mb-0">{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.toteutusilmoitusKokonaan)}</p>
        </div>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Jatkopäätös</h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">1. jatkopäätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Asiatunnus</p>
          <p className="md:col-span-1 mb-0">
            {formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm)}
          </p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero || "-"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">2. jatkopäätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Asiatunnus</p>
          <p className="md:col-span-1 mb-0">
            {formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm)}
          </p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.toinenJatkopaatos?.asianumero || "-"}</p>
        </div>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Hallinto-oikeus</h3>
        <ContentSpacer>
          <h4 className="vayla-small-title">Hallinto-oikeuden välipäätös</h4>
          <p className="vayla-label">Päivämäärä</p>
          <p>{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.hallintoOikeus?.valipaatos?.paiva)}</p>
          <p className="vayla-label">Hallinto-oikeuden välipäätöksen sisältö</p>
          <PreWrapParagraph>{projekti.kasittelynTila?.hallintoOikeus?.valipaatos?.sisalto || "-"}</PreWrapParagraph>
        </ContentSpacer>
        <ContentSpacer>
          <h4 className="vayla-small-title">Hallinto-oikeuden päätös</h4>
          <p className="vayla-label">Päivämäärä</p>
          <p>{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.hallintoOikeus?.paatos?.paiva)}</p>
          <p className="vayla-label">Hallinto-oikeuden päätöksen sisältö</p>
          <PreWrapParagraph>{projekti.kasittelynTila?.hallintoOikeus?.paatos?.sisalto || "-"}</PreWrapParagraph>
          <p className="vayla-label">Hyväksymispäätös kumottu</p>
          <p>{paatosKumottuTextValue(projekti.kasittelynTila?.hallintoOikeus?.hyvaksymisPaatosKumottu)}</p>
        </ContentSpacer>
      </Section>
      <Section>
        <h3 className="vayla-subtitle">Korkein hallinto-oikeus</h3>
        <ContentSpacer>
          <h4 className="vayla-small-title">Korkeimman hallinto-oikeuden välipäätös</h4>
          <p className="vayla-label">Päivämäärä</p>
          <p>{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.korkeinHallintoOikeus?.valipaatos?.paiva)}</p>
          <p className="vayla-label">Hallinto-oikeuden välipäätöksen sisältö</p>
          <PreWrapParagraph>{projekti.kasittelynTila?.korkeinHallintoOikeus?.valipaatos?.sisalto || "-"}</PreWrapParagraph>
        </ContentSpacer>
        <ContentSpacer>
          <h4 className="vayla-small-title">Korkeimman hallinto-oikeuden päätös</h4>
          <p className="vayla-label">Päivämäärä</p>
          <p>{formatDateIfExistsAndValidOtherwiseDash(projekti.kasittelynTila?.korkeinHallintoOikeus?.paatos?.paiva)}</p>
          <p className="vayla-label">Hallinto-oikeuden päätöksen sisältö</p>
          <PreWrapParagraph>{projekti.kasittelynTila?.korkeinHallintoOikeus?.paatos?.sisalto || "-"}</PreWrapParagraph>
          <p className="vayla-label">Hyväksymispäätös kumottu</p>
          <p>{paatosKumottuTextValue(projekti.kasittelynTila?.korkeinHallintoOikeus?.hyvaksymisPaatosKumottu)}</p>
        </ContentSpacer>
      </Section>
      <Section>
        <H3>Lisätietoa käsittelyn tilasta</H3>
        <PreWrapParagraph>{projekti.kasittelynTila?.lisatieto || "-"}</PreWrapParagraph>
      </Section>
    </>
  );
}

function paatosKumottuTextValue(hyvaksymisPaatosKumottu: boolean | undefined | null) {
  if (typeof hyvaksymisPaatosKumottu === "boolean") {
    return hyvaksymisPaatosKumottu ? "Kyllä" : "Ei";
  } else {
    return "Ei tiedossa";
  }
}
