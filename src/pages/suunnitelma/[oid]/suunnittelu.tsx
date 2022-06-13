import React, { ReactElement, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import { useRouter } from "next/router";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "src/util/dateUtils";
import dayjs from "dayjs";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import { VuorovaikutusTilaisuus, VuorovaikutusTilaisuusTyyppi } from "@services/api";
import capitalize from "lodash/capitalize";
import { SoittoajanYhteystieto } from "@components/projekti/suunnitteluvaihe/VuorovaikutusMahdollisuudet";
import { PageProps } from "@pages/_app";
import ExtLink from "@components/ExtLink";
import { parseVideoURL } from "src/util/videoParser";
import PalauteLomakeDialogi from "src/components/projekti/kansalaisnakyma/PalauteLomakeDialogi";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import { ProjektiKayttajaJulkinen } from "@services/api";

export default function Suunnittelu({ setRouteLabels }: PageProps): ReactElement {
  const router = useRouter();
  const [palauteLomakeOpen, setPalauteLomakeOpen] = useState(false);
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);
  const { t } = useTranslation();

  useProjektiBreadcrumbs(setRouteLabels);

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

  const yhteystiedotListana =
    vuorovaikutus?.vuorovaikutusYhteystiedot?.map((yhteystieto) => t("common:yhteystieto", yhteystieto)) || [];

  const suunnittelusopimus = projekti?.aloitusKuulutusJulkaisut?.[0].suunnitteluSopimus;

  const suunnitelmaluonnokset = vuorovaikutus?.suunnitelmaluonnokset;
  const esittelyaineistot = vuorovaikutus?.esittelyaineistot;

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title="Tutustu hankkeeseen ja vuorovaikuta">
      <>
        <Section>
          <SectionContent>
            <h4 className="vayla-small-title">{t(`projekti:ui-otsikot.suunnitteluhankkeen_kuvaus`)}</h4>
            <p>{projekti.suunnitteluVaihe.hankkeenKuvaus?.SUOMI}</p>
          </SectionContent>
          <SectionContent>
            <h4 className="vayla-small-title">{t(`projekti:ui-otsikot.suunnittelun_eteneminen`)}</h4>
            <p>{projekti.suunnitteluVaihe.suunnittelunEteneminenJaKesto}</p>
          </SectionContent>
          <SectionContent>
            <h4 className="vayla-small-title">{t(`projekti:ui-otsikot.arvio_seuraavan_vaiheen_alkamisesta`)}</h4>
            <p>{projekti.suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta}</p>
          </SectionContent>
        </Section>
        <Section noDivider>
          <SectionContent>
            <h3 className="vayla-title">{t(`projekti:ui-otsikot.vaikuttamisen_mahdollisuudet_ja_aikataulut`)}</h3>
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
            <h4 className="vayla-small-title">{t(`projekti:ui-otsikot.tulevat_vuorovaikutustilaisuudet`)}</h4>
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
                          <TilaisuusIcon tyyppi={tilaisuus.tyyppi} />
                          <TilaisuusTitle tilaisuus={tilaisuus} />
                        </div>
                        <TilaisuusContent tilaisuus={tilaisuus} projektiHenkilot={projekti.projektiHenkilot} />
                      </div>
                    );
                  })}
              </div>
            )}
          </SectionContent>
          {menneetTilaisuudet && menneetTilaisuudet.length > 0 && (
            <SectionContent>
              <h4 className="vayla-small-title">{t(`projekti:ui-otsikot.menneet_vuorovaikutustilaisuudet`)}</h4>
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
                          <TilaisuusIcon tyyppi={tilaisuus.tyyppi} inactive />
                          <TilaisuusTitle tilaisuus={tilaisuus} />
                        </div>
                        <TilaisuusContent tilaisuus={tilaisuus} projektiHenkilot={projekti.projektiHenkilot} />
                      </div>
                    );
                  })}
              </div>
            </SectionContent>
          )}
          <SectionContent>
            <h4 className="vayla-small-title">{t(`projekti:ui-otsikot.esittelyaineisto_ja_suunnitelmaluonnokset`)}</h4>
            {!vuorovaikutus && <p>Aineistot ja luonnokset julkaistaan lähempänä vuorovaikutustilaisuutta.</p>}
            {/* TODO: oma laskuri aineistoijen esilla ololle, mielellaan valmiiksi jo taustapalvelusta saatuna */}
            {vuorovaikutus && (
              <p>
                Suunnitelmaluonnokset ja esittelyaineistot ovat tutustuttavissa{" "}
                {formatDate(dayjs(vuorovaikutus.vuorovaikutusJulkaisuPaiva).add(30, "day"))} asti
              </p>
            )}
            {esittelyaineistot && esittelyaineistot.length > 0 && (
              <>
                <h5 className="vayla-smallest-title">{t(`projekti:esittelyaineistot`)}</h5>
                {esittelyaineistot?.map((aineisto) =>
                  aineisto.tiedosto ? (
                    <ExtLink
                      style={{ display: "block", marginTop: "0.5em" }}
                      key={aineisto.dokumenttiOid}
                      href={`/tiedostot/suunnitelma/${projekti.oid}${aineisto.tiedosto}`}
                    >
                      {aineisto.tiedosto.split("/").reduce((_acc, cur) => cur, "") || "Linkki"}
                    </ExtLink>
                  ) : null
                )}
              </>
            )}
            {suunnitelmaluonnokset && suunnitelmaluonnokset.length > 0 && (
              <>
                <h5 className="vayla-smallest-title">{t(`projekti:suunnitelmaluonnokset`)}</h5>
                {suunnitelmaluonnokset?.map((aineisto) =>
                  aineisto.tiedosto ? (
                    <ExtLink
                      style={{ display: "block", marginTop: "0.5em" }}
                      key={aineisto.dokumenttiOid}
                      href={`/tiedostot/suunnitelma/${projekti.oid}${aineisto.tiedosto}`}
                    >
                      {aineisto.tiedosto.split("/").reduce((_acc, cur) => cur, "") || "Linkki"}
                    </ExtLink>
                  ) : null
                )}
              </>
            )}
            {vuorovaikutus?.videot && vuorovaikutus.videot.length > 0 && (
              <>
                <h5 className="vayla-smallest-title">{t(`projekti:ui-otsikot.video_materiaalit`)}</h5>
                <p>Tutustu ennalta kuvattuun videoesittelyyn alta.</p>
                {vuorovaikutus?.videot?.map((video, index) => {
                  return (
                    <React.Fragment key={index}>
                      {(parseVideoURL(video.url) && (
                        <iframe width={"640px"} height={"360"} src={parseVideoURL(video.url)}></iframe>
                      )) || <p>&lt;Videolinkki ei ole kelvollinen&gt;</p>}
                    </React.Fragment>
                  );
                })}
              </>
            )}
            {vuorovaikutus?.suunnittelumateriaali?.url && (
              <>
                <h5 className="vayla-smallest-title">{t(`projekti:ui-otsikot.muut_materiaalit`)}</h5>
                <p>{vuorovaikutus.suunnittelumateriaali.nimi}</p>
                <p>
                  <ExtLink href={vuorovaikutus.suunnittelumateriaali.url}>
                    {vuorovaikutus.suunnittelumateriaali.url}
                  </ExtLink>
                </p>
              </>
            )}
          </SectionContent>
        </Section>
        {vuorovaikutus &&
          vuorovaikutus.vuorovaikutusYhteystiedot &&
          vuorovaikutus.vuorovaikutusYhteystiedot.length > 0 && (
            <Section>
              <SectionContent>
                <h5 className="vayla-small-title">{t("common:yhteystiedot")}</h5>
                <p>
                  {t("common:lisatietoja_antavat", {
                    yhteystiedot: yhteystiedotListana.join(", "),
                  })}
                  {/* TODO vaihda projektin suunnittelusopimustietoihin kun saatavilla */}
                  {suunnittelusopimus && (
                    <>
                      {` ${t("common:ja")} `}
                      {suunnittelusopimus.etunimi} {suunnittelusopimus.sukunimi} puh. {suunnittelusopimus.puhelinnumero}{" "}
                      {suunnittelusopimus.email} ({capitalize(suunnittelusopimus.kunta)}).
                    </>
                  )}
                </p>
              </SectionContent>
            </Section>
          )}
        {vuorovaikutus && (
          <>
            <JataPalautettaNappi teksti={t("projekti:palautelomake.jata_palaute")} onClick={() => setPalauteLomakeOpen(true)} />
            <PalauteLomakeDialogi
              vuorovaikutus={vuorovaikutus}
              open={palauteLomakeOpen}
              onClose={() => setPalauteLomakeOpen(false)}
              projekti={projekti}
            />
          </>
        )}
      </>
    </ProjektiJulkinenPageLayout>
  );
}

function TilaisuusContent({
  tilaisuus,
  projektiHenkilot,
}: {
  tilaisuus: VuorovaikutusTilaisuus;
  projektiHenkilot: ProjektiKayttajaJulkinen[] | null | undefined;
}) {
  return (
    <>
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && (
        <div>
          <p>
            Osoite: {tilaisuus.osoite}, {tilaisuus.postinumero} {tilaisuus.postitoimipaikka}
          </p>
          <p>
            Yleisötilaisuus järjestetään fyysisenä tilaisuutena ylläolevassa osoitteessa.{" "}
            {tilaisuus.Saapumisohjeet ? capitalize(tilaisuus.Saapumisohjeet) : undefined}
          </p>
        </div>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
        <div>
          <p>
            Voit soittaa alla esitetyille henkilöille myös soittoajan ulkopuolella, mutta parhaiten tavoitat heidät
            esitettynä ajankohtana.
          </p>
          {tilaisuus.projektiYhteysHenkilot
            ?.map(
              (yhteyshenkilo) => projektiHenkilot?.find((hlo) => yhteyshenkilo === hlo.id) as ProjektiKayttajaJulkinen
            )
            .map((yhteystieto: ProjektiKayttajaJulkinen) => {
              return (
                <p key={yhteystieto.id}>
                  {yhteystieto.nimi}
                  {yhteystieto.organisaatio ? ` (${yhteystieto.organisaatio})` : null}: {yhteystieto.puhelinnumero}
                </p>
              );
            })}
          {tilaisuus.esitettavatYhteystiedot?.map((yhteystieto, index) => {
            return <SoittoajanYhteystieto key={index} yhteystieto={yhteystieto} />;
          })}
        </div>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && (
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
}

function TilaisuusIcon({ tyyppi, inactive }: { tyyppi: VuorovaikutusTilaisuusTyyppi; inactive?: true }) {
  return (
    <>
      {tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && (
        <LocationCityIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />
      )}
      {tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
        <LocalPhoneIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />
      )}
      {tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && (
        <HeadphonesIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />
      )}
    </>
  );
}

function TilaisuusTitle({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuus }) {
  const { t } = useTranslation();

  return (
    <p>
      <b>
        {capitalize(t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`))} {formatDate(tilaisuus.paivamaara)}{" "}
        klo {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
        {tilaisuus.nimi ? `, ${capitalize(tilaisuus.nimi)}` : undefined}
      </b>
    </p>
  );
}
