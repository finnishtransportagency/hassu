import React, { FunctionComponent, ReactElement, useCallback, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "src/util/dateUtils";
import dayjs from "dayjs";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import {
  ProjektiJulkinen,
  VuorovaikutusKierrosJulkinen,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusJulkinen,
  VuorovaikutusTilaisuusTyyppi,
} from "@services/api";
import capitalize from "lodash/capitalize";
import ExtLink from "@components/ExtLink";
import { parseVideoURL } from "src/util/videoParser";
import PalauteLomakeDialogi from "src/components/projekti/kansalaisnakyma/PalauteLomakeDialogi";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import FormatDate from "@components/FormatDate";
import { splitFilePath } from "../../../util/fileUtil";
import classNames from "classnames";
import Trans from "next-translate/Trans";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";

export default function Suunnittelu(): ReactElement {
  const { t } = useTranslation("suunnittelu");
  const { data: projekti } = useProjektiJulkinen();

  if (!projekti?.vuorovaikutusKierrokset || projekti.vuorovaikutusKierrokset.length === 0) {
    return <></>;
  }

  const viimeisinKierros = projekti.vuorovaikutusKierrokset[projekti.vuorovaikutusKierrokset.length - 1];

  const migroitu = viimeisinKierros.tila == VuorovaikutusKierrosTila.MIGROITU;
  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title={t("otsikko")}>
      {!migroitu && (
        <>
          <Perustiedot vuorovaikutusKierros={viimeisinKierros} />
          <VuorovaikutusTiedot projekti={projekti} vuorovaikutus={viimeisinKierros} projektiOid={projekti.oid} />
        </>
      )}
      {migroitu && (
        <Section noDivider>
          <>
            <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>
          </>
        </Section>
      )}
    </ProjektiJulkinenPageLayout>
  );
}

const Perustiedot: FunctionComponent<{ vuorovaikutusKierros: VuorovaikutusKierrosJulkinen }> = ({ vuorovaikutusKierros }) => {
  const { t } = useTranslation("suunnittelu");
  const kieli = useKansalaiskieli();
  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">{t("perustiedot.suunnitteluhankkeen_kuvaus")}</h4>
        <p>{vuorovaikutusKierros.hankkeenKuvaus?.[kieli]}</p>
      </SectionContent>
      {vuorovaikutusKierros.suunnittelunEteneminenJaKesto?.[kieli] && (
        <SectionContent>
          <h4 className="vayla-small-title">{t("perustiedot.suunnittelun_eteneminen")}</h4>
          <p>{vuorovaikutusKierros.suunnittelunEteneminenJaKesto[kieli]}</p>
        </SectionContent>
      )}
      {vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta?.[kieli] && (
        <SectionContent>
          <h4 className="vayla-small-title">{t("perustiedot.arvio_seuraavan_vaiheen_alkamisesta")}</h4>
          <p>{vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta[kieli]}</p>
        </SectionContent>
      )}
    </Section>
  );
};

const VuorovaikutusTiedot: FunctionComponent<{
  vuorovaikutus: VuorovaikutusKierrosJulkinen | undefined;
  projekti: ProjektiJulkinen;
  projektiOid: string;
}> = ({ vuorovaikutus, projektiOid }) => {
  const [palauteLomakeOpen, setPalauteLomakeOpen] = useState(false);
  const { t, lang } = useTranslation("suunnittelu");
  const kieli = useKansalaiskieli();

  const now = dayjs();

  const menneetTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) =>
    dayjs(t.paivamaara)
      .hour(Number(t.paattymisAika.split(":")[0]))
      .minute(Number(t.paattymisAika.split(":")[1]))
      .isBefore(now)
  );

  const tulevatTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) => !menneetTilaisuudet || !menneetTilaisuudet.includes(t));

  const suunnitelmaluonnokset = vuorovaikutus?.suunnitelmaluonnokset;
  const esittelyaineistot = vuorovaikutus?.esittelyaineistot;

  const kutsuPDFPath = splitFilePath(vuorovaikutus?.vuorovaikutusPDFt?.[kieli]?.kutsuPDFPath);

  return (
    <>
      <Section noDivider>
        <SectionContent>
          <h3 className="vayla-title">{t("vuorovaikuttaminen.otsikko")}</h3>
          <p>{t("vuorovaikuttaminen.voit_osallistua_vuorovaikutuksiin")}</p>
          {vuorovaikutus && (
            <>
              <Trans i18nKey="suunnittelu:vuorovaikuttaminen.aineistot_ovat_tutustuttavissa" components={{ p: <p />, a: <a href="" /> }} />
              <Trans
                i18nKey="suunnittelu:vuorovaikuttaminen.kysymykset_ja_palautteet"
                values={{ paivamaara: formatDate(vuorovaikutus.kysymyksetJaPalautteetViimeistaan) }}
                components={{ p: <p />, a: <a href="" /> }}
              />
            </>
          )}
        </SectionContent>
        <SectionContent>
          <h4 className="vayla-small-title">{t("tilaisuudet.tulevat_tilaisuudet")}</h4>
          {!!tulevatTilaisuudet?.length ? <TilaisuusLista tilaisuudet={tulevatTilaisuudet} /> : <p>{t("tilaisuudet.julkaistaan_pian")}</p>}
        </SectionContent>
        {!!menneetTilaisuudet?.length && (
          <SectionContent>
            <h4 className="vayla-small-title">{t("tilaisuudet.menneet_tilaisuudet")}</h4>
            <TilaisuusLista tilaisuudet={menneetTilaisuudet} inaktiivinen />
          </SectionContent>
        )}
        <SectionContent>
          <h4 className="vayla-small-title">{t("aineistot.otsikko")}</h4>
          {/* TODO: oma laskuri aineistoijen esilla ololle, mielellaan valmiiksi jo taustapalvelusta saatuna */}
          {vuorovaikutus ? (
            <p>
              {t("aineistot.ovat_tutustuttavissa", {
                paivamaara: formatDate(dayjs(vuorovaikutus.vuorovaikutusJulkaisuPaiva).add(30, "day")),
              })}
            </p>
          ) : (
            <p>{t("aineistot.julkaistaan")}</p>
          )}
          {!!esittelyaineistot?.length && (
            <>
              <h5 className="vayla-smallest-title">{t("aineistot.esittelyaineisto")}</h5>
              {esittelyaineistot.map((aineisto) =>
                aineisto.tiedosto ? (
                  <ExtLink
                    className="file_download"
                    style={{ display: "block", marginTop: "0.5em" }}
                    key={aineisto.dokumenttiOid}
                    href={aineisto.tiedosto}
                  >
                    {aineisto.nimi} <span className="ml-2 text-black">({aineisto.nimi.split(".").pop()}) </span>{" "}
                    {aineisto.tuotu && formatDate(aineisto.tuotu)}
                  </ExtLink>
                ) : null
              )}
            </>
          )}
          {!!suunnitelmaluonnokset?.length && (
            <>
              <h5 className="vayla-smallest-title">{t("aineistot.suunnitelmaluonnokset")}</h5>
              {suunnitelmaluonnokset.map((aineisto) =>
                aineisto.tiedosto ? (
                  <ExtLink
                    className="file_download"
                    style={{ display: "block", marginTop: "0.5em" }}
                    key={aineisto.dokumenttiOid}
                    href={aineisto.tiedosto}
                  >
                    {aineisto.nimi} <span className="ml-2 text-black">({aineisto.nimi.split(".").pop()}) </span>{" "}
                    {aineisto.tuotu && formatDate(aineisto.tuotu)}
                  </ExtLink>
                ) : null
              )}
            </>
          )}
          {!!vuorovaikutus?.videot?.length && (
            <>
              <h5 className="vayla-smallest-title">{t(`videoesittely.otsikko`)}</h5>
              <p>{t("videoesittely.tutustu")}</p>
              {vuorovaikutus.videot?.map((video, index) => {
                const url = video?.[kieli]?.url;
                if (url) {
                  return (
                    <React.Fragment key={index}>
                      {(parseVideoURL(url) && <iframe width={"640px"} height={"360"} src={parseVideoURL(url)}></iframe>) || (
                        <p>&lt;{t("videoesittely.ei_kelvollinen")}&gt;</p>
                      )}
                    </React.Fragment>
                  );
                }
              })}
            </>
          )}
          {vuorovaikutus?.suunnittelumateriaali?.[kieli]?.url && (
            <>
              <h5 className="vayla-smallest-title">{t(`muut_materiaalit.otsikko`)}</h5>
              <p>{vuorovaikutus.suunnittelumateriaali?.[kieli]?.nimi}</p>
              <p>
                <ExtLink className="file_download" href={vuorovaikutus.suunnittelumateriaali?.[kieli]?.url}>
                  {vuorovaikutus.suunnittelumateriaali?.[kieli]?.url}
                </ExtLink>
              </p>
            </>
          )}
        </SectionContent>
      </Section>
      {!!vuorovaikutus?.yhteystiedot?.length && (
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">{t("common:yhteystiedot")}</h5>
            <p>
              {t("common:lisatietoja_antavat", {
                count: vuorovaikutus.yhteystiedot.length,
              })}
            </p>
            {vuorovaikutus.yhteystiedot.map((yhteystieto, index) => (
              <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>
            ))}
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
            projektiOid={projektiOid}
          />
          <h4 className="vayla-small-title">{t(`ladattava_kuulutus.otsikko`)}</h4>
          <SectionContent className="flex gap-4">
            <ExtLink className="file_download" href={kutsuPDFPath.path}>
              {kutsuPDFPath.fileName}
            </ExtLink>{" "}
            ({kutsuPDFPath.fileExt}) (
            <FormatDate date={vuorovaikutus?.vuorovaikutusJulkaisuPaiva} />)
          </SectionContent>
        </>
      )}
    </>
  );
};

const TilaisuusLista: FunctionComponent<{
  tilaisuudet: VuorovaikutusTilaisuusJulkinen[];
  inaktiivinen?: true;
}> = ({ tilaisuudet, inaktiivinen }) => {
  const { t } = useTranslation("suunnittelu");

  const sortTilaisuudet = useCallback((a, b) => {
    if (dayjs(a.paivamaara).isBefore(dayjs(b.paivamaara))) {
      return -1;
    }
    if (dayjs(a.paivamaara).isAfter(dayjs(b.paivamaara))) {
      return 1;
    }
    return 0;
  }, []);

  return (
    <div className="vayla-tilaisuus-list">
      {tilaisuudet.sort(sortTilaisuudet).map((tilaisuus, index) => {
        return (
          <div key={index} className={classNames("vayla-tilaisuus-item", inaktiivinen ? "inactive" : "active")}>
            <div className="flex flex-cols gap-5">
              <TilaisuusIcon tyyppi={tilaisuus.tyyppi} inactive={inaktiivinen} />
              <TilaisuusTitle tilaisuus={tilaisuus} /> {!!tilaisuus.peruttu && <span className="text-red">{t("suunnittelu:PERUTTU")}</span>}
            </div>
            <TilaisuusContent tilaisuus={tilaisuus} />
          </div>
        );
      })}
    </div>
  );
};

function TilaisuusContent({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuusJulkinen }) {
  const { t, lang } = useTranslation("suunnittelu");
  const kieli = useKansalaiskieli();
  return (
    <>
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && (
        <div>
          <p>
            {t("tilaisuudet.paikalla.osoite", {
              paikka: tilaisuus.paikka?.[kieli] && tilaisuus.paikka[kieli] !== "" ? tilaisuus.paikka[kieli] + ", " : "",
              osoite: tilaisuus.osoite?.[kieli],
              postinumero: tilaisuus.postinumero,
              postitoimipaikka: tilaisuus.postitoimipaikka?.[kieli] || "",
            })}
          </p>
          <p>{t("tilaisuudet.paikalla.yleisotilaisuus_jarjestetaan")}</p>
          {tilaisuus.Saapumisohjeet?.[kieli] && (
            <p>
              {t("tilaisuudet.paikalla.saapumisohje", {
                saapumisohje: " " + tilaisuus.Saapumisohjeet?.[kieli],
              })}
            </p>
          )}
        </div>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
        <div>
          <p>{t("tilaisuudet.soittoaika.voit_soittaa")}</p>

          {tilaisuus.yhteystiedot?.map((yhteystieto, index) => {
            return <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>;
          })}
        </div>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && (
        <div>
          <p>{t("tilaisuudet.verkossa.yleisotilaisuus_jarjestetaan_verkkotapahtumana")}</p>
          <p>{t("tilaisuudet.verkossa.tilaisuus_toteutetaan_teamsin")}</p>
          <p>{t("tilaisuudet.verkossa.liity_tilaisuuteen")}</p>
        </div>
      )}
    </>
  );
}

function TilaisuusIcon({ tyyppi, inactive }: { tyyppi: VuorovaikutusTilaisuusTyyppi; inactive?: true }) {
  return (
    <>
      {tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && <LocationCityIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />}
      {tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && <LocalPhoneIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />}
      {tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && <HeadphonesIcon sx={{ color: inactive ? "#999999" : "#0064AF" }} />}
    </>
  );
}

function TilaisuusTitle({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuusJulkinen }) {
  const { t } = useTranslation();
  const kieli = useKansalaiskieli();
  const nimi = tilaisuus.nimi?.[kieli];

  return (
    <p>
      <b>
        {capitalize(t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`))} {formatDate(tilaisuus.paivamaara)} {t("common:klo")}{" "}
        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
        {nimi ? `, ${capitalize(nimi)}` : undefined}
      </b>
    </p>
  );
}
