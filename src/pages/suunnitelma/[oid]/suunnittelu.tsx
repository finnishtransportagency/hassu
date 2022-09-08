import React, { FC, ReactElement, useCallback, useState } from "react";
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
  SuunnitteluSopimus,
  SuunnitteluVaiheJulkinen,
  VuorovaikutusJulkinen,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusTyyppi,
} from "@services/api";
import capitalize from "lodash/capitalize";
import { SoittoajanYhteystieto } from "@components/projekti/suunnitteluvaihe/VuorovaikutusMahdollisuudet";
import { PageProps } from "@pages/_app";
import ExtLink from "@components/ExtLink";
import { parseVideoURL } from "src/util/videoParser";
import PalauteLomakeDialogi from "src/components/projekti/kansalaisnakyma/PalauteLomakeDialogi";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import { ProjektiKayttajaJulkinen } from "@services/api";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import useProjektiBreadcrumbsJulkinen from "src/hooks/useProjektiBreadcrumbsJulkinen";
import FormatDate from "@components/FormatDate";
import { splitFilePath } from "../../../util/fileUtil";
import classNames from "classnames";
import Trans from "next-translate/Trans";

export default function Suunnittelu({ setRouteLabels }: PageProps): ReactElement {
  const { t } = useTranslation("suunnittelu");
  useProjektiBreadcrumbsJulkinen(setRouteLabels);
  const { data: projekti } = useProjektiJulkinen();

  if (!projekti?.suunnitteluVaihe) {
    return <></>;
  }

  return (
    <ProjektiJulkinenPageLayout selectedStep={1} title={t("otsikko")}>
      <Perustiedot suunnitteluVaihe={projekti.suunnitteluVaihe} />
      <VuorovaikutusTiedot
        projekti={projekti}
        suunnitteluVaihe={projekti.suunnitteluVaihe}
        vuorovaikutus={projekti.suunnitteluVaihe.vuorovaikutukset?.[0]}
        suunnittelusopimus={projekti?.aloitusKuulutusJulkaisut?.[0].suunnitteluSopimus}
        projektiHenkilot={projekti.projektiHenkilot}
        projektiOid={projekti.oid}
      />
    </ProjektiJulkinenPageLayout>
  );
}

const Perustiedot: FC<{ suunnitteluVaihe: SuunnitteluVaiheJulkinen }> = ({ suunnitteluVaihe }) => {
  const { t } = useTranslation("suunnittelu");
  const kieli = useKansalaiskieli();
  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">{t("perustiedot.suunnitteluhankkeen_kuvaus")}</h4>
        <p>{suunnitteluVaihe.hankkeenKuvaus?.[kieli]}</p>
      </SectionContent>
      {suunnitteluVaihe.suunnittelunEteneminenJaKesto && (
        <SectionContent>
          <h4 className="vayla-small-title">{t("perustiedot.suunnittelun_eteneminen")}</h4>
          <p>{suunnitteluVaihe.suunnittelunEteneminenJaKesto}</p>
        </SectionContent>
      )}
      <SectionContent>
        <h4 className="vayla-small-title">{t("perustiedot.arvio_seuraavan_vaiheen_alkamisesta")}</h4>
        <p>{suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta}</p>
      </SectionContent>
    </Section>
  );
};

const VuorovaikutusTiedot: FC<{
  vuorovaikutus: VuorovaikutusJulkinen | undefined;
  projekti: ProjektiJulkinen;
  suunnitteluVaihe: SuunnitteluVaiheJulkinen;
  suunnittelusopimus: SuunnitteluSopimus | null | undefined;
  projektiHenkilot: ProjektiKayttajaJulkinen[] | null | undefined;
  projektiOid: string;
}> = ({ suunnittelusopimus, vuorovaikutus, projektiHenkilot, projektiOid }) => {
  const [palauteLomakeOpen, setPalauteLomakeOpen] = useState(false);
  const { t } = useTranslation("suunnittelu");
  const kieli = useKansalaiskieli();

  const today = dayjs();

  const tulevatTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) =>
    dayjs(t.paivamaara).isAfter(today || dayjs(t.paivamaara).isSame(today))
  );
  const menneetTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) => dayjs(t.paivamaara).isBefore(today));

  const yhteystiedotListana = vuorovaikutus?.vuorovaikutusYhteystiedot?.map((yhteystieto) => t("common:yhteystieto", yhteystieto)) || [];

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
          {!!tulevatTilaisuudet?.length && !!projektiHenkilot ? (
            <TilaisuusLista tilaisuudet={tulevatTilaisuudet} projektiHenkilot={projektiHenkilot} />
          ) : (
            <p>{t("tilaisuudet.julkaistaan_pian")}</p>
          )}
        </SectionContent>
        {!!menneetTilaisuudet?.length && !!projektiHenkilot && (
          <SectionContent>
            <h4 className="vayla-small-title">{t("tilaisuudet.menneet_tilaisuudet")}</h4>
            <TilaisuusLista tilaisuudet={menneetTilaisuudet} projektiHenkilot={projektiHenkilot} inaktiivinen />
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
          {esittelyaineistot?.length && (
            <>
              <h5 className="vayla-smallest-title">{t("aineistot.esittelyaineisto")}</h5>
              {esittelyaineistot.map((aineisto) =>
                aineisto.tiedosto ? (
                  <ExtLink
                    style={{ display: "block", marginTop: "0.5em" }}
                    key={aineisto.dokumenttiOid}
                    href={`/tiedostot/suunnitelma/${projektiOid}${aineisto.tiedosto}`}
                  >
                    {aineisto.tiedosto.split("/").reduce((_acc, cur) => cur, "")}
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
                    style={{ display: "block", marginTop: "0.5em" }}
                    key={aineisto.dokumenttiOid}
                    href={`/tiedostot/suunnitelma/${projektiOid}${aineisto.tiedosto}`}
                  >
                    {aineisto.tiedosto.split("/").reduce((_acc, cur) => cur, "")}
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
                return (
                  <React.Fragment key={index}>
                    {(parseVideoURL(video.url) && <iframe width={"640px"} height={"360"} src={parseVideoURL(video.url)}></iframe>) || (
                      <p>&lt;{t("videoesittely.ei_kelvollinen")}&gt;</p>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
          {vuorovaikutus?.suunnittelumateriaali?.url && (
            <>
              <h5 className="vayla-smallest-title">{t(`muut_materiaalit.otsikko`)}</h5>
              <p>{vuorovaikutus.suunnittelumateriaali.nimi}</p>
              <p>
                <ExtLink href={vuorovaikutus.suunnittelumateriaali.url}>{vuorovaikutus.suunnittelumateriaali.url}</ExtLink>
              </p>
            </>
          )}
        </SectionContent>
      </Section>
      {!!vuorovaikutus?.vuorovaikutusYhteystiedot?.length && (
        <Section>
          <SectionContent>
            <h5 className="vayla-small-title">{t("common:yhteystiedot")}</h5>
            <p>
              {t("common:lisatietoja_antavat", {
                yhteystiedot: yhteystiedotListana.join(", "),
                count: yhteystiedotListana.length,
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
            projektiOid={projektiOid}
          />
          <h4 className="vayla-small-title">{t(`ladattava_kuulutus.otsikko`)}</h4>
          <SectionContent className="flex gap-4">
            <ExtLink href={kutsuPDFPath.path}>{kutsuPDFPath.fileName}</ExtLink> ({kutsuPDFPath.fileExt}) (
            <FormatDate date={vuorovaikutus?.vuorovaikutusJulkaisuPaiva} />)
          </SectionContent>
        </>
      )}
    </>
  );
};

const TilaisuusLista: FC<{ tilaisuudet: VuorovaikutusTilaisuus[]; projektiHenkilot: ProjektiKayttajaJulkinen[]; inaktiivinen?: true }> = ({
  tilaisuudet,
  projektiHenkilot,
  inaktiivinen,
}) => {
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
              <TilaisuusTitle tilaisuus={tilaisuus} />
            </div>
            <TilaisuusContent tilaisuus={tilaisuus} projektiHenkilot={projektiHenkilot} />
          </div>
        );
      })}
    </div>
  );
};

function TilaisuusContent({
  tilaisuus,
  projektiHenkilot,
}: {
  tilaisuus: VuorovaikutusTilaisuus;
  projektiHenkilot: ProjektiKayttajaJulkinen[] | null | undefined;
}) {
  const { t } = useTranslation("suunnittelu");
  return (
    <>
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && (
        <div>
          <p>
            {t("tilaisuus_paikalla.osoite", {
              osoite: tilaisuus.osoite,
              postinumero: tilaisuus.postinumero,
              postitoimipaikka: tilaisuus.postitoimipaikka,
            })}
          </p>
          <p>
            {t("tilaisuus_paikalla.yleisotilaisuus_jarjestetaan")}
            {tilaisuus.Saapumisohjeet && capitalize(" " + tilaisuus.Saapumisohjeet)}
          </p>
        </div>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
        <div>
          <p>{t("tilaisuus_soittoaika.voit_soittaa")}</p>
          {tilaisuus.projektiYhteysHenkilot
            ?.map((yhteyshenkilo) => projektiHenkilot?.find((hlo) => yhteyshenkilo === hlo.id) as ProjektiKayttajaJulkinen)
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
          <p>{t("tilaisuus_verkossa.yleisotilaisuus_jarjestetaan_verkkotapahtumana")}</p>
          <p>{t("tilaisuus_verkossa.tilaisuus_toteutetaan_teamsin")}</p>
          <p>{t("tilaisuus_verkossa.liity_tilaisuuteen")}</p>
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

function TilaisuusTitle({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuus }) {
  const { t } = useTranslation();

  return (
    <p>
      <b>
        {capitalize(t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`))} {formatDate(tilaisuus.paivamaara)} {t("common:klo")}{" "}
        {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
        {tilaisuus.nimi ? `, ${capitalize(tilaisuus.nimi)}` : undefined}
      </b>
    </p>
  );
}
