import React, { ReactElement } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { useRouter } from "next/router";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { YhteystietoInput } from "@services/api";
import { formatDate } from "src/util/dateUtils";
import dayjs from "dayjs";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { VuorovaikutusTilaisuus, VuorovaikutusTilaisuusTyyppi } from "@services/api";
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
  const today = dayjs();

  if (!projekti || !projekti.suunnitteluVaihe) {
    return <></>;
  }

  const vuorovaikutus = projekti.suunnitteluVaihe.vuorovaikutukset?.[0];
  const tulevatTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) =>
    dayjs(t.paivamaara).isAfter(today || dayjs(t.paivamaara).isSame(today))
  );
  const menneetTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) =>
    dayjs(t.paivamaara).isBefore(today)
  );

  const getIcon = (tyyppi: VuorovaikutusTilaisuusTyyppi, inactive?: boolean) => {
    console.log("TilaisuusIcon rendered");
    switch (tyyppi) {
      case VuorovaikutusTilaisuusTyyppi.PAIKALLA:
        return <LocationCityIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />;
      case VuorovaikutusTilaisuusTyyppi.SOITTOAIKA:
        return <LocalPhoneIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />;
      case VuorovaikutusTilaisuusTyyppi.VERKOSSA:
        return <HeadphonesIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />;
      default:
        return <QuestionMarkIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />;
    }
  };

  const TilaisuusTitle = React.memo((props: { tilaisuus: VuorovaikutusTilaisuus }) => {
    return (
      <p>
        <b>
          {capitalize(t(`common:viikonpaiva_${dayjs(props.tilaisuus.paivamaara).day()}`))}{" "}
          {formatDate(props.tilaisuus.paivamaara)} klo {props.tilaisuus.alkamisAika}-{props.tilaisuus.paattymisAika},{" "}
          {capitalize(props.tilaisuus.nimi)}
        </b>
      </p>
    );
  });

  TilaisuusTitle.displayName = "TilaisuusTitle";

  const TilaisuusContent = React.memo((props: { tilaisuus: VuorovaikutusTilaisuus }) => {
    console.log("TilaisuusTitle rendered");
    return (
      <>
        {props.tilaisuus && props.tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && (
          <div>
            <p>
              Osoite: {props.tilaisuus.osoite}, {props.tilaisuus.postinumero} {props.tilaisuus.postitoimipaikka}
            </p>
            <p>
              Yleisötilaisuus järjestetään fyysisenä tilaisuutena ylläolevassa osoitteessa.{" "}
              {props.tilaisuus.Saapumisohjeet ? capitalize(props.tilaisuus.Saapumisohjeet) : undefined}
            </p>
          </div>
        )}
        {props.tilaisuus && props.tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
          <div>
            <p>
              Voit soittaa alla esitetyille henkilöille myös soittoajan ulkopuolella, mutta parhaiten tavoitat heidät
              esitettynä ajankohtana.
            </p>
            <p>Pekka Kallisto, projektipäällikkö (Varsinais-Suomen ELY-keskus): 0401238979</p>
          </div>
        )}
        {props.tilaisuus && props.tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && (
          <div>
            <p>Yleisötilaisuus järjestetään suorana verkkotapahtumana.</p>
            <p>
              Tilaisuus toteutetaan Teamsin välityksellä. Teams-sovelluksen asentamista omalle laitteelle ei edellytetä.
              Liittymislinkki toimii Internet-selaimella tietokoneella tai mobiililaitteella.
            </p>
            <p>
              Liity tilaisuuteen: Tilaisuuden liittymislinkki julkaistaan tässä kaksi (2) tuntia ennen tilaisuuden alkua
              ja poistetaan tilaisuuden jälkeen.
            </p>
          </div>
        )}
      </>
    );
  });

  TilaisuusContent.displayName = "SuunnitteluContent";

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title="Tutustu hankkeeseen ja vuorovaikuta">
      <>
        <Section>
          <SectionContent>
            <h4 className="vayla-small-title">Suunnitteluhankkeen kuvaus</h4>
            <p>{projekti.suunnitteluVaihe.hankkeenKuvaus?.SUOMI}</p>
          </SectionContent>
          <SectionContent>
            <h4 className="vayla-small-title">Suunnittelun eteneminen</h4>
            <p>{projekti.suunnitteluVaihe.suunnittelunEteneminenJaKesto}</p>
          </SectionContent>
          <SectionContent>
            <h4 className="vayla-small-title">Arvio seuraavan vaiheen alkamisesta</h4>
            <p>{projekti.suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta}</p>
          </SectionContent>
        </Section>
        <Section>
          <SectionContent>
            <h3 className="vayla-title">Osallistumisen ja vaikuttamisen mahdollisuudet ja aikataulut</h3>
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
                  Suunnitelmaluonnokset ja esittelyaineistot ovat tutustuttavissa sivun alareunassa.{" "}
                  <a href="">Siirry aineistoihin.</a>
                </p>
                <p>
                  Kysymykset ja palautteet toivotaan esitettävän{" "}
                  {formatDate(vuorovaikutus.kysymyksetJaPalautteetViimeistaan)} mennessä.{" "}
                  <a href="">Siirry lomakkeelle.</a>
                </p>
              </>
            )}
          </SectionContent>
          <SectionContent>
            <h4 className="vayla-small-title">Tulevat vuorovaikutustilaisuudet</h4>
            {(!vuorovaikutus || !tulevatTilaisuudet || tulevatTilaisuudet.length < 1) && (
              <p>Vuorovaikutustilaisuudet julkaistaan mahdollisimman pian.</p>
            )}
            {tulevatTilaisuudet && (
              <div className="vayla-tilaisuus-list">
                {tulevatTilaisuudet
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
                      <div key={index} className="vayla-tilaisuus-item active">
                        <div className="flex flex-cols gap-5">
                          {getIcon(tilaisuus.tyyppi)}
                          <TilaisuusTitle tilaisuus={tilaisuus} />
                        </div>
                        <TilaisuusContent tilaisuus={tilaisuus} />
                      </div>
                    );
                  })}
              </div>
            )}
          </SectionContent>
          {menneetTilaisuudet && (
            <SectionContent>
              <h4 className="vayla-small-title">Menneet vuorovaikutustilaisuudet</h4>
              <div className="vayla-tilaisuus-list">
                {menneetTilaisuudet
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
                      <div key={index} className="vayla-tilaisuus-item inactive">
                        <div className="flex flex-cols gap-5">
                          {getIcon(tilaisuus.tyyppi, true)}
                          <TilaisuusTitle tilaisuus={tilaisuus} />
                        </div>
                        <TilaisuusContent tilaisuus={tilaisuus} />
                      </div>
                    );
                  })}
              </div>
            </SectionContent>
          )}
          <SectionContent>
            <h4 className="vayla-small-title">Esittelyaineisto ja suunnitelmaluonnokset</h4>
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
