import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { useRouter } from "next/router";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { YhteystietoInput } from "@services/api";
import { formatDate, formatDayOfWeek } from "src/util/dateUtils";
import dayjs from "dayjs";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { VuorovaikutusTilaisuusTyyppi } from "@services/api";
import capitalize from "lodash/capitalize";

export default function Suunnittelu(): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);
  const { t } = useTranslation();

  const mockVuorovaikutusYhteystiedot: YhteystietoInput[] = [
    {
      etunimi: "Veijo",
      sukunimi: "Väylämies",
      puhelinnumero: "029 000 0000",
      sahkoposti: "etunimi.sukunimi@vayla.fi",
      organisaatio: "Väylävirasto",
    },
    {
      etunimi: "Veijo",
      sukunimi: "Väylämies",
      puhelinnumero: "029 000 0000",
      sahkoposti: "etunimi.sukunimi@vayla.fi",
      organisaatio: "Väylävirasto",
    },
    {
      etunimi: "Veijo",
      sukunimi: "Väylämies",
      puhelinnumero: "029 000 0000",
      sahkoposti: "etunimi.sukunimi@vayla.fi",
      organisaatio: "Väylävirasto",
    },
  ];

  const yhteystiedotListana = mockVuorovaikutusYhteystiedot.map((yhteystieto) => t("common:yhteystieto", yhteystieto));

  if (!projekti || !projekti.suunnitteluVaihe) {
    return <></>;
  }

  const vuorovaikutus = projekti.suunnitteluVaihe.vuorovaikutukset?.[0]; //TODO voiko olla useita, ja mika niista naytetaan

  const getIcon = (tyyppi: VuorovaikutusTilaisuusTyyppi) => {
    switch (tyyppi) {
      case VuorovaikutusTilaisuusTyyppi.PAIKALLA:
        return <LocationCityIcon />;
      case VuorovaikutusTilaisuusTyyppi.SOITTOAIKA:
        return <LocalPhoneIcon />;
      case VuorovaikutusTilaisuusTyyppi.VERKOSSA:
        return <HeadphonesIcon />;
      default:
        return <QuestionMarkIcon />;
    }
  };

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title="Tutustu hankkeeseen ja vuorovaikuta">
      <>
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">Suunnitteluhankkeen kuvaus</h5>
            <p>{projekti.suunnitteluVaihe.hankkeenKuvaus?.SUOMI}</p>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Suunnittelun eteneminen</h5>
            <p>{projekti.suunnitteluVaihe.suunnittelunEteneminenJaKesto}</p>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Arvio seuraavan vaiheen alkamisesta</h5>
            <p>{projekti.suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta}</p>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">Osallistumisen ja vaikuttamisen mahdollisuudet ja aikataulut</h5>
            {!vuorovaikutus && (
              <p>
                Voit osallistua vuorovaikutustilaisuuksiin, tutustua suunnittelu- ja esittelyaineistoihin sekä jättää
                palautteen tai kysyä hankkeesta. Osallistumalla sinulla on mahdollisuus vaikuttaa hankkeen
                suunnitteluun.
              </p>
            )}
            {vuorovaikutus && (
              <>
                <p>
                  Voit osallistua vuorovaikutustilaisuuksiin, tutustua suunnittelu- ja esittelyaineistoihin sekä jättää
                  palautteen tai kysyä hankkeesta. Osallistumalla sinulla on mahdollisuus vaikuttaa hankkeen
                  suunnitteluun.
                </p>
                <p>
                  Suunnitelmaluonnokset ja esittelyaineistot ovat tutustuttavissa sivun alareunassa. Siirry
                  aineistoihin.
                </p>
                <p>
                  Kysymykset ja palautteet toivotaan esitettävän{" "}
                  {formatDate(vuorovaikutus.kysymyksetJaPalautteetViimeistaan)} mennessä. Siirry lomakkeelle.
                </p>
              </>
            )}
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Tulevat vuorovaikutustilaisuudet</h5>
            {!vuorovaikutus && <p>Vuorovaikutustilaisuudet julkaistaan mahdollisimman pian.</p>}
            {vuorovaikutus && (
              <div className="vayla-tilaisuus-list">
                {vuorovaikutus.vuorovaikutusTilaisuudet
                  ?.sort((a, b) => {
                    if (dayjs(a.paivamaara).isBefore(dayjs(b.paivamaara))) {
                      return -1;
                    }
                    if (dayjs(a.paivamaara).isAfter(dayjs(b.paivamaara))) {
                      return 1;
                    }
                    return 0;
                  })
                  .map((tilaisuus, index) => {
                    return (
                      <div key={index} className="vayla-tilaisuus-item">
                        <div className="flex flex-cols gap-5">
                          {getIcon(tilaisuus.tyyppi)}
                          <p>
                            <b>
                              {formatDayOfWeek(tilaisuus.paivamaara)} {formatDate(tilaisuus.paivamaara)} klo{" "}
                              {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}, {capitalize(tilaisuus.nimi)}
                            </b>
                          </p>
                        </div>
                        <div>
                          <p>Yleisötilaisuus järjestetään suorana verkkotapahtumana.</p>
                          <p>
                            Tilaisuus toteutetaan Teamsin välityksellä. Teams-sovelluksen asentamista omalle laitteelle
                            ei edellytetä. Liittymislinkki toimii Internet-selaimella tietokoneella tai
                            mobiililaitteella.{" "}
                          </p>
                          <p>
                            Liity tilaisuuteen: Tilaisuuden liittymislinkki julkaistaan tässä kaksi (2) tuntia ennen
                            tilaisuuden alkua ja poistetaan tilaisuuden jälkeen.
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-small-title">Esittelyaineisto ja suunnitelmaluonnokset</h5>
            {!vuorovaikutus && <p>Aineistot ja luonnokset julkaistaan lähempänä vuorovaikutustilaisuutta.</p>}
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">{t("common:yhteystiedot")}</h5>
            <p>
              {t("common:lisatietoja_antavat", {
                yhteystiedot:
                  yhteystiedotListana.slice(0, -1).join(", ") + ` ${t("common:ja")} ` + yhteystiedotListana.slice(-1),
              })}
            </p>
          </SectionContent>
        </Section>
      </>
    </ProjektiJulkinenPageLayout>
  );
}
