import React, { FunctionComponent, ReactElement, useCallback, useMemo, useState } from "react";
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
  Kieli,
  LokalisoituLinkki,
  ProjektiJulkinen,
  Status,
  VuorovaikutusKierrosJulkinen,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusJulkinen,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
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
import EuLogo from "@components/projekti/common/EuLogo";
import { muodostaOrganisaatioTeksti, yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import StyledLink from "@components/StyledLink";
import { experimental_sx as sx, styled } from "@mui/material";
import replace from "lodash/replace";

export default function Suunnittelu(): ReactElement {
  const { t } = useTranslation("suunnittelu");
  const { data: projekti } = useProjektiJulkinen();

  const viimeisinKierros = projekti?.vuorovaikutusKierrokset?.[projekti?.vuorovaikutusKierrokset.length - 1];

  const migroitu = viimeisinKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;
  const kieli = useKansalaiskieli();

  const saameContent = useMemo(() => {
    if (projekti && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI) {
      const { path, fileExt, fileName } = splitFilePath(viimeisinKierros?.vuorovaikutusSaamePDFt?.POHJOISSAAME?.tiedosto || undefined);
      return (
        <div>
          <h2 className="vayla-small-title">Bovdehus vuorrováikkuhussii</h2>
          {/* Kuulutus vuorovaikutustilaisuuteen */}
          <h3 className="vayla-label">{projekti.kielitiedot.projektinNimiVieraskielella}</h3>
          {path && (
            <p>
              <ExtLink className="file_download" href={path} style={{ marginRight: "0.5rem" }}>
                {fileName}
              </ExtLink>{" "}
              ({fileExt}) (
              <FormatDate date={viimeisinKierros?.vuorovaikutusSaamePDFt?.POHJOISSAAME?.tuotu} />)
            </p>
          )}
          <p className="mt-2">
            Sáhtát guođđit máhcahaga dahje jearrat plánemis plána prošeaktaoaivámuččas. Plána evttohusat ja ovdanbuktinmateriálat leat
            siiddu vuolleravddas.
            {/*Voit jättää palautetta tai kysyä suunnitelmasta suunnitelman projektipäälliköltä. Suunnitelman luonnokset ja esittelyaineistot löytyvät sivun alareunasta.*/}
          </p>
        </div>
      );
    } else {
      return null;
    }
  }, [projekti, kieli, viimeisinKierros]);

  if (!viimeisinKierros) {
    return <></>;
  }

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title={t("otsikko")} saameContent={migroitu ? null : saameContent}>
      {!migroitu && (
        <>
          <Perustiedot vuorovaikutusKierros={viimeisinKierros} />
          <VuorovaikutusTiedot projekti={projekti} vuorovaikutus={viimeisinKierros} projektiOid={projekti.oid} />
          <EuLogo projekti={projekti} />
        </>
      )}
      {migroitu && (
        <Section noDivider>
          <>
            <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
            {kieli === Kieli.SUOMI && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && (
              <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
                Plána hálddahuslaš gieđahallan lea álgán ovdal Stáhta johtalusfávlliid plánen bálvalusa atnuiváldima, nuba diehtu bálvalusas
                ii leat oažžumis. Jus dus leat jearaldagat plánema muttuin, sáhtát leat oktavuođas plána prošeaktaoaivámužžii.
              </p>
            )}
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
    <Section className="mt-8">
      <SectionContent className="mt-8">
        <h3 className="vayla-subtitle">{t("perustiedot.suunnitteluhankkeen_kuvaus")}</h3>
        <p>{vuorovaikutusKierros.hankkeenKuvaus?.[kieli]}</p>
      </SectionContent>
      {vuorovaikutusKierros.suunnittelunEteneminenJaKesto?.[kieli] && (
        <SectionContent className="mt-8">
          <h3 className="vayla-subtitle">{t("perustiedot.suunnittelun_eteneminen")}</h3>
          <p>{vuorovaikutusKierros.suunnittelunEteneminenJaKesto[kieli]}</p>
        </SectionContent>
      )}
      {vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta?.[kieli] && (
        <SectionContent className="mt-8">
          <h3 className="vayla-subtitle">{t("perustiedot.arvio_seuraavan_vaiheen_alkamisesta")}</h3>
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
  const { t } = useTranslation("suunnittelu");
  const kieli = useKansalaiskieli();
  const { data: projekti } = useProjektiJulkinen();

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

  const hasVideoURL = useCallback(
    (videot: LokalisoituLinkki[] | null | undefined) => {
      const url = videot?.find((video) => {
        if (video?.[kieli]?.url) return true;
      });

      return !!url;
    },
    [kieli]
  );

  return (
    <>
      <Section noDivider>
        <SectionContent>
          <h2 className="vayla-title mb-8">{t("vuorovaikuttaminen.otsikko")}</h2>
          <p>{t("vuorovaikuttaminen.voit_osallistua_vuorovaikutuksiin")}</p>
          {vuorovaikutus && (
            <>
              <p>
                <Trans
                  i18nKey="suunnittelu:vuorovaikuttaminen.kysymykset_ja_palautteet"
                  values={{ paivamaara: formatDate(vuorovaikutus.kysymyksetJaPalautteetViimeistaan) }}
                  components={{ strong: <strong /> }}
                />{" "}
                {projekti?.status === Status.SUUNNITTELU && (
                  <Trans
                    i18nKey="suunnittelu:vuorovaikuttaminen.siirry_lomakkeelle"
                    components={{
                      a: <StyledLink sx={{ fontWeight: 400 }} as="button" type="button" onClick={() => setPalauteLomakeOpen(true)} />,
                    }}
                  />
                )}
              </p>
            </>
          )}
        </SectionContent>
        <SectionContent className="mt-8">
          <h3 className="vayla-subtitle">{t("tilaisuudet.tulevat_tilaisuudet")}</h3>
          {!!tulevatTilaisuudet?.length ? <TilaisuusLista tilaisuudet={tulevatTilaisuudet} /> : <p>{t("tilaisuudet.julkaistaan_pian")}</p>}
        </SectionContent>
        {!!menneetTilaisuudet?.length && (
          <SectionContent className="mt-8">
            <h3 className="vayla-subtitle">{t("tilaisuudet.menneet_tilaisuudet")}</h3>
            <p>{t("tilaisuudet.kiitos_osallistumisesta")}</p>
            <TilaisuusLista tilaisuudet={menneetTilaisuudet} inaktiivinen />
          </SectionContent>
        )}
        <SectionContent className="mt-8">
          <h2 className="vayla-title">{t("aineistot.otsikko")}</h2>
          {/* TODO: oma laskuri aineistoijen esilla ololle, mielellaan valmiiksi jo taustapalvelusta saatuna */}
          {vuorovaikutus ? (
            <p>
              <Trans
                i18nKey="suunnittelu:aineistot.ovat_tutustuttavissa"
                components={{
                  strong: <strong />,
                }}
                values={{ paivamaara: formatDate(dayjs(vuorovaikutus.vuorovaikutusJulkaisuPaiva).add(30, "day")) }}
              />
            </p>
          ) : (
            <p>{t("aineistot.julkaistaan")}</p>
          )}
          {!!esittelyaineistot?.length && (
            <SectionContent className="mt-6">
              <h3 className="vayla-subtitle">{t("aineistot.esittelyaineisto")}</h3>
              {esittelyaineistot.map((aineisto) =>
                aineisto.tiedosto ? (
                  <p key={aineisto.dokumenttiOid} style={{ marginTop: "0.5em" }}>
                    <ExtLink
                      className="file_download"
                      style={{ marginRight: "0.5rem" }}
                      key={aineisto.dokumenttiOid}
                      href={aineisto.tiedosto}
                    >
                      {aineisto.nimi}
                    </ExtLink>{" "}
                    <span className="ml-2">({aineisto.nimi.split(".").pop()})</span> ({aineisto.tuotu && formatDate(aineisto.tuotu)})
                  </p>
                ) : null
              )}
            </SectionContent>
          )}
          {!!suunnitelmaluonnokset?.length && (
            <SectionContent className="mt-6">
              <h3 className="vayla-subtitle">{t("aineistot.suunnitelmaluonnokset")}</h3>
              {suunnitelmaluonnokset.map((aineisto) =>
                aineisto.tiedosto ? (
                  <p key={aineisto.dokumenttiOid} style={{ marginTop: "0.5em" }}>
                    <ExtLink
                      className="file_download"
                      style={{ marginRight: "0.5rem" }}
                      key={aineisto.dokumenttiOid}
                      href={aineisto.tiedosto}
                    >
                      {aineisto.nimi}
                    </ExtLink>
                    <span className="ml-2">({aineisto.nimi.split(".").pop()}) </span> {aineisto.tuotu && formatDate(aineisto.tuotu)}
                  </p>
                ) : null
              )}
            </SectionContent>
          )}
          {hasVideoURL(vuorovaikutus?.videot) && (
            <SectionContent className="mt-8">
              <h3 className="vayla-subtitle">{t(`videoesittely.otsikko`)}</h3>
              <p>{t("videoesittely.tutustu")}</p>
              {vuorovaikutus?.videot?.map((video, index) => {
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
            </SectionContent>
          )}
          {vuorovaikutus?.suunnittelumateriaali?.[kieli]?.url && (
            <SectionContent className="mt-8">
              <h3 className="vayla-subtitle">{t(`muut_materiaalit.otsikko`)}</h3>
              <p>{vuorovaikutus.suunnittelumateriaali?.[kieli]?.nimi}</p>
              <p>
                <ExtLink className="file_download" href={vuorovaikutus.suunnittelumateriaali?.[kieli]?.url}>
                  {vuorovaikutus.suunnittelumateriaali?.[kieli]?.url}
                </ExtLink>
              </p>
            </SectionContent>
          )}
        </SectionContent>
      </Section>
      {vuorovaikutus && (
        <Section noDivider className="mt-10">
          {projekti?.status === Status.SUUNNITTELU && (
            <SectionContent>
              <h2 className="vayla-title">{t("kysy_tai_anna_palautetta")}</h2>
              <JataPalautettaNappi teksti={t("projekti:palautelomake.jata_palaute")} onClick={() => setPalauteLomakeOpen(true)} />
              <PalauteLomakeDialogi
                vuorovaikutus={vuorovaikutus}
                open={palauteLomakeOpen}
                onClose={() => setPalauteLomakeOpen(false)}
                projektiOid={projektiOid}
              />
            </SectionContent>
          )}

          <SectionContent>
            <h2 className="vayla-title">{t(`ladattava_kuulutus.otsikko`)}</h2>
            <p>
              <ExtLink className="file_download" href={kutsuPDFPath.path} style={{ marginRight: "0.5rem" }}>
                {kutsuPDFPath.fileName}
              </ExtLink>{" "}
              ({kutsuPDFPath.fileExt}) (
              <FormatDate date={vuorovaikutus?.vuorovaikutusJulkaisuPaiva} />)
            </p>
          </SectionContent>
        </Section>
      )}
      {!!vuorovaikutus?.yhteystiedot?.length && (
        <Section noDivider className="mt-8 mb-10">
          <SectionContent>
            <h2 className="vayla-title">{t("common:yhteystiedot")}</h2>
            <p>
              {t("common:lisatietoja_antavat", {
                count: vuorovaikutus.yhteystiedot.length,
              })}
            </p>
            {vuorovaikutus.yhteystiedot.map((yhteystieto, index) => (
              <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
            ))}
          </SectionContent>
        </Section>
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
    <div className="vayla-tilaisuus-list mt-6">
      {tilaisuudet.sort(sortTilaisuudet).map((tilaisuus, index) => {
        return (
          <div key={index} className={classNames("vayla-tilaisuus-item", inaktiivinen ? "inactive" : "active")}>
            <div className="flex flex-cols gap-5">
              <TilaisuusIcon tyyppi={tilaisuus.tyyppi} inactive={inaktiivinen} />
              <TilaisuusTitle tilaisuus={tilaisuus} /> {!!tilaisuus.peruttu && <span className="text-red">{t("suunnittelu:PERUTTU")}</span>}
            </div>
            <TilaisuusNimi tilaisuus={tilaisuus} />
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
        <KorttiContent>
          <p>
            <strong>{t("tilaisuudet.paikalla.paikka")}: </strong>
            {tilaisuus.paikka?.[kieli] && tilaisuus.paikka[kieli] !== "" ? tilaisuus.paikka[kieli] : ""}
          </p>
          <p>
            <strong>{t("tilaisuudet.paikalla.osoite")}: </strong>
            {t("tilaisuudet.paikalla.osoitetiedot", {
              osoite: tilaisuus.osoite?.[kieli],
              postinumero: tilaisuus.postinumero,
              postitoimipaikka: tilaisuus.postitoimipaikka?.[kieli] || "",
            })}
          </p>
          <p></p>
          {tilaisuus.Saapumisohjeet?.[kieli] && (
            <p>
              <strong>{t("tilaisuudet.paikalla.saapumisohje")}: </strong>
              {t("tilaisuudet.paikalla.yleisotilaisuus_jarjestetaan")}
              {" " + tilaisuus.Saapumisohjeet?.[kieli]}
            </p>
          )}
        </KorttiContent>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
        <KorttiContent>
          <p>{t("tilaisuudet.soittoaika.voit_soittaa")}</p>

          {tilaisuus.yhteystiedot?.map((yhteystieto, index) => {
            return <p key={index}>{yhteystietoKansalaiselleTekstiksi(lang, yhteystieto, t)}</p>;
          })}
        </KorttiContent>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && (
        <KorttiContent>
          <p>
            <strong>{t("tilaisuudet.verkossa.liity_tilaisuuteen")}</strong>
            {tilaisuus.linkki ? (
              <ExtLink href={tilaisuus.linkki}>{tilaisuus.linkki}</ExtLink>
            ) : (
              t("tilaisuudet.verkossa.liittymislinkki_julkaistaan")
            )}
          </p>
          <p>{t("tilaisuudet.verkossa.yleisotilaisuus_jarjestetaan_verkkotapahtumana")}</p>
        </KorttiContent>
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
  return (
    <>
      <h4 className="vayla-smallest-title">
        {tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && "Yleisötilaisuus: "}
        {tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && "Soittoaika: "}
        {tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && "Verkkotapahtuma: "}
        {capitalize(t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`))} {formatDate(tilaisuus.paivamaara)} {t("common:klo")}{" "}
        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
      </h4>
    </>
  );
}

function TilaisuusNimi({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuusJulkinen }) {
  const kieli = useKansalaiskieli();
  const nimi = tilaisuus.nimi?.[kieli];

  return (
    <KorttiContent>
      <p>
        <strong>{nimi ? capitalize(nimi) : undefined}</strong>
      </p>
    </KorttiContent>
  );
}

export function Yhteystietokortti({ yhteystieto }: { yhteystieto: Yhteystieto }) {
  const { t, lang } = useTranslation();
  const { etunimi, sukunimi, puhelinnumero, sahkoposti, titteli } = yhteystieto;
  const organisaatioTeksti = muodostaOrganisaatioTeksti(yhteystieto, t, lang);

  return (
    <YhteystietokorttiContent>
      <p>{`${etunimi} ${sukunimi}${titteli ? `, ${titteli},` : ""}`}</p>
      <p>
        {t("common:puh")} {puhelinnumero}
      </p>
      <p>
        {replace(sahkoposti, "@", "[at]")} ({organisaatioTeksti})
      </p>
    </YhteystietokorttiContent>
  );
}

const KorttiContent = styled("div")(sx({ "& > p": { marginBottom: "0.75rem" } }));
const YhteystietokorttiContent = styled("div")(sx({ "& > p": { margin: 0 } }));
