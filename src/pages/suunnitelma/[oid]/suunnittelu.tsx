import React, { FunctionComponent, ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import ProjektiJulkinenPageLayout from "@components/projekti/kansalaisnakyma/ProjektiJulkinenPageLayout";
import Section from "@components/layout/Section2";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ContentSpacer from "@components/layout/ContentSpacer";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "hassu-common/util/dateUtils";
import dayjs from "dayjs";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import {
  Kieli,
  Linkki,
  LokalisoituLinkki,
  ProjektiJulkinen,
  Status,
  VelhoJulkinen,
  VuorovaikutusJulkinen,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusJulkinen,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "@services/api";
import capitalize from "lodash/capitalize";
import upperFirst from "lodash/upperFirst";
import ExtLink from "@components/ExtLink";
import { parseVideoURL } from "src/util/videoParser";
import PalauteLomakeDialogi from "src/components/projekti/kansalaisnakyma/PalauteLomakeDialogi";
import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import classNames from "classnames";
import Trans from "next-translate/Trans";
import EuLogo from "@components/projekti/common/EuLogo";
import { muodostaOrganisaatioTeksti } from "src/util/kayttajaTransformationUtil";
import StyledLink from "@components/StyledLink";
import { experimental_sx as sx, styled, SvgIconTypeMap } from "@mui/material";
import replace from "lodash/replace";
import KeyValueTable, { KeyValueData } from "@components/KeyValueTable";
import { kuntametadata } from "hassu-common/kuntametadata";
import { isStatusGreaterOrEqualTo } from "common/statusOrder";
import SaameContent from "@components/projekti/kansalaisnakyma/SaameContent";
import { H3, H4, H5 } from "@components/Headings";
import { AineistoLinkkiLista } from "@components/projekti/kansalaisnakyma/AineistoLinkkiLista";
import { TiedostoLinkkiLista } from "@components/projekti/kansalaisnakyma/TiedostoLinkkiLista";
import { PreWrapParagraph } from "@components/PreWrapParagraph";
import { useRouter } from "next/router";
import { getSivuTilanPerusteella } from "@components/kansalaisenEtusivu/Hakutulokset";
import { useIsBelowBreakpoint } from "../../../hooks/useIsSize";
import { OverridableComponent } from "@mui/material/OverridableComponent";

export default function Suunnittelu(): ReactElement {
  const { t } = useTranslation("suunnittelu");
  const { data: projekti, error } = useProjektiJulkinen();
  const SAAME_CONTENT_TEXTS = {
    otsikko: "Bovdehus vuorrováikkuhussii",
    kappale1:
      "Sáhtát guođđit máhcahaga dahje jearrat plánemis plána prošeaktaoaivámuččas. Plána evttohusat ja ovdanbuktinmateriálat leat siiddu vuolleravddas.",
  };

  const migroitu = projekti?.vuorovaikutukset?.tila == VuorovaikutusKierrosTila.MIGROITU;
  const kieli = useKansalaiskieli();
  const router = useRouter();

  useEffect(() => {
    if (projekti && projekti.status === Status.EI_JULKAISTU) router.push(`/suunnitelma/${projekti?.oid}`);
    if (projekti && !projekti.vuorovaikutukset) {
      router.push(`/suunnitelma/${projekti?.oid}/${getSivuTilanPerusteella(projekti?.status)}`);
    }
  }, [projekti, router]);

  if (error) {
    return <>{t("common:projektin_lataamisessa_virhe")}</>;
  }
  if (!(projekti?.vuorovaikutukset && projekti.velho)) {
    return <>{t("common:ladataan")}</>;
  }

  return (
    <ProjektiJulkinenPageLayout
      selectedStep={Status.SUUNNITTELU}
      title={t("otsikko")}
      saameContent={
        migroitu ? null : (
          <SaameContent
            kielitiedot={projekti.kielitiedot}
            kuulutusPDF={projekti?.vuorovaikutukset?.vuorovaikutusSaamePDFt?.POHJOISSAAME}
            otsikko={SAAME_CONTENT_TEXTS.otsikko}
            kappale1={SAAME_CONTENT_TEXTS.kappale1}
          />
        )
      }
    >
      {!migroitu && (
        <>
          <Perustiedot vuorovaikutusKierros={projekti?.vuorovaikutukset} velho={projekti.velho} />
          <VuorovaikutusTiedot projekti={projekti} vuorovaikutus={projekti?.vuorovaikutukset} projektiOid={projekti.oid} />
          <EuLogo projekti={projekti} />
        </>
      )}
      {migroitu && (
        <Section noDivider>
          <p>{t("projekti:suunnitelma_on_tuotu_toisesta_jarjestelmasta")}</p>
          {kieli === Kieli.SUOMI && projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && (
            <p aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
              Plána hálddahuslaš gieđahallan lea álgán ovdal Stáhta johtalusfávlliid plánen bálvalusa atnuiváldima, nuba diehtu bálvalusas
              ii leat oažžumis. Jus dus leat jearaldagat plánema muttuin, sáhtát leat oktavuođas plána prošeaktaoaivámužžii.
            </p>
          )}
        </Section>
      )}
    </ProjektiJulkinenPageLayout>
  );
}

const Perustiedot: FunctionComponent<{ vuorovaikutusKierros: VuorovaikutusJulkinen; velho: VelhoJulkinen }> = ({
  vuorovaikutusKierros,
  velho,
}) => {
  const { t, lang } = useTranslation();
  const kieli = useKansalaiskieli();

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + kuntametadata.namesForMaakuntaIds(velho.maakunnat, lang).join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + kuntametadata.namesForKuntaIds(velho.kunnat, lang).join(", ");
  }

  const keyValueData: KeyValueData[] = [
    {
      header: t(`projekti:ui-otsikot.julkaisupaiva`),
      data: `${formatDate(vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva)}`,
    },
    { header: t(`projekti:ui-otsikot.hankkeen_sijainti`), data: sijainti },
    { header: t(`projekti:ui-otsikot.suunnitelman_tyyppi`), data: velho?.tyyppi && t(`projekti:projekti-tyyppi.${velho?.tyyppi}`) },
  ];

  return (
    <Section>
      <KeyValueTable rows={keyValueData} kansalaisnakyma />
      <ContentSpacer>
        <H3 variant="h4">{t(`suunnittelu:perustiedot.suunnitteluhankkeen_kuvaus`)}</H3>
        <PreWrapParagraph>{vuorovaikutusKierros.hankkeenKuvaus?.[kieli]}</PreWrapParagraph>
      </ContentSpacer>
      {vuorovaikutusKierros.suunnittelunEteneminenJaKesto?.[kieli] && (
        <ContentSpacer>
          <H3 variant="h4">{t("suunnittelu:perustiedot.suunnittelun_eteneminen")}</H3>
          <PreWrapParagraph>{vuorovaikutusKierros.suunnittelunEteneminenJaKesto[kieli]}</PreWrapParagraph>
        </ContentSpacer>
      )}
      {vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta?.[kieli] && (
        <ContentSpacer>
          <H3 variant="h4">{t("suunnittelu:perustiedot.arvio_seuraavan_vaiheen_alkamisesta")}</H3>
          <p>{vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta[kieli]}</p>
        </ContentSpacer>
      )}
    </Section>
  );
};

const VuorovaikutusTiedot: FunctionComponent<{
  vuorovaikutus: VuorovaikutusJulkinen | undefined;
  projekti: ProjektiJulkinen;
  projektiOid: string;
}> = ({ vuorovaikutus, projektiOid }) => {
  const [palauteLomakeOpen, setPalauteLomakeOpen] = useState(false);
  const isMobile = useIsBelowBreakpoint("md");
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

  const tulevatTilaisuudet = vuorovaikutus?.vuorovaikutusTilaisuudet?.filter((t) => !menneetTilaisuudet?.includes(t));

  const suunnitelmaluonnokset = vuorovaikutus?.suunnitelmaluonnokset;
  const esittelyaineistot = vuorovaikutus?.esittelyaineistot;

  const kutsuPDFPath = vuorovaikutus?.vuorovaikutusPDFt?.[kieli]?.kutsuPDFPath;

  const hasVideoURL = useCallback(
    (videot: LokalisoituLinkki[] | null | undefined) => {
      const url = videot?.find((video) => {
        if (video?.[kieli]?.url) return true;
      });

      return !!url;
    },
    [kieli]
  );

  if (!projekti) {
    return null;
  }

  return (
    <Section noDivider>
      <ContentSpacer>
        <H3>{t("vuorovaikuttaminen.otsikko")}</H3>
        <p>{t("vuorovaikuttaminen.voit_osallistua_vuorovaikutuksiin")}</p>
        {vuorovaikutus && (
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
        )}
      </ContentSpacer>
      <ContentSpacer>
        <H4>{t("tilaisuudet.tulevat_tilaisuudet")}</H4>
        {tulevatTilaisuudet?.length ? (
          <TilaisuusLista tilaisuudet={tulevatTilaisuudet} />
        ) : (
          <p>
            {t("tilaisuudet.kiitos_osallistumisesta")}{" "}
            {isStatusGreaterOrEqualTo(projekti.status, Status.NAHTAVILLAOLO) ? null : t("tilaisuudet.kaikki_vastaanotetut")}
          </p>
        )}
      </ContentSpacer>
      {!!menneetTilaisuudet?.length && (
        <ContentSpacer>
          <H4>{t("tilaisuudet.menneet_tilaisuudet")}</H4>
          <p>{t("tilaisuudet.kiitos_osallistumisesta")}</p>
          <TilaisuusLista tilaisuudet={menneetTilaisuudet} inaktiivinen />
        </ContentSpacer>
      )}
      <ContentSpacer>
        <H4>{t("aineistot.otsikko")}</H4>
        {/* TODO: oma laskuri aineistoijen esilla ololle, mielellaan valmiiksi jo taustapalvelusta saatuna */}
        {vuorovaikutus?.suunnitelmaluonnokset?.length || vuorovaikutus?.esittelyaineistot?.length ? (
          <p>
            <Trans i18nKey="suunnittelu:aineistot.voi_tutustua" />
          </p>
        ) : (
          <p>{t(isStatusGreaterOrEqualTo(projekti.status, Status.NAHTAVILLAOLO) ? "aineistot.poistettu" : "aineistot.julkaistaan")}</p>
        )}
        {!!esittelyaineistot?.length && vuorovaikutus?.vuorovaikutusJulkaisuPaiva && (
          <ContentSpacer>
            <H5>{t("aineistot.esittelyaineisto")}</H5>
            <AineistoLinkkiLista aineistot={esittelyaineistot} julkaisupaiva={vuorovaikutus?.vuorovaikutusJulkaisuPaiva} />
          </ContentSpacer>
        )}
        {!!suunnitelmaluonnokset?.length && vuorovaikutus?.vuorovaikutusJulkaisuPaiva && (
          <ContentSpacer>
            <H5>{t("aineistot.suunnitelmaluonnokset")}</H5>
            <AineistoLinkkiLista aineistot={suunnitelmaluonnokset} julkaisupaiva={vuorovaikutus?.vuorovaikutusJulkaisuPaiva} />
          </ContentSpacer>
        )}
        {hasVideoURL(vuorovaikutus?.videot) && (
          <ContentSpacer>
            <H5>{t(`videoesittely.otsikko`)}</H5>
            <p>{t("videoesittely.tutustu")}</p>
            {vuorovaikutus?.videot?.map((video, index) => {
              const url = video?.[kieli]?.url;
              if (url) {
                return (
                  <React.Fragment key={index}>
                    {(parseVideoURL(url) && (
                      <iframe width={isMobile ? "320px" : "640px"} height={isMobile ? "180px" : "360px"} src={parseVideoURL(url)}></iframe>
                    )) || <p>&lt;{t("videoesittely.ei_kelvollinen")}&gt;</p>}
                  </React.Fragment>
                );
              }
            })}
          </ContentSpacer>
        )}
        {!!vuorovaikutus?.suunnittelumateriaali?.filter((linkki) => linkki[kieli]?.url).length && (
          <ContentSpacer>
            <H5>{t(`muut_materiaalit.otsikko`)}</H5>
            {vuorovaikutus?.suunnittelumateriaali
              ?.filter((linkki) => linkki[kieli]?.url)
              .map((linkki) => (
                <ContentSpacer gap={2} key={(linkki[kieli] as Linkki).url}>
                  <p>{linkki[kieli]?.nimi}</p>
                  <p>
                    <ExtLink className="file_download" href={linkki[kieli]?.url}>
                      {linkki[kieli]?.url}
                    </ExtLink>
                  </p>
                </ContentSpacer>
              ))}
          </ContentSpacer>
        )}
      </ContentSpacer>
      {vuorovaikutus && (
        <>
          {projekti?.status === Status.SUUNNITTELU && (
            <ContentSpacer>
              <JataPalautettaNappi teksti={t("projekti:palautelomake.jata_palaute")} onClick={() => setPalauteLomakeOpen(true)} />
              <PalauteLomakeDialogi
                vuorovaikutus={vuorovaikutus}
                open={palauteLomakeOpen}
                onClose={() => setPalauteLomakeOpen(false)}
                projektiOid={projektiOid}
                projekti={projekti}
              />
            </ContentSpacer>
          )}
          {!!vuorovaikutus?.yhteystiedot?.length && (
            <ContentSpacer>
              <H4>{t("common:yhteystiedot")}</H4>
              <p>
                {t("common:lisatietoja_antavat", {
                  count: vuorovaikutus.yhteystiedot.length,
                })}
              </p>
              {vuorovaikutus.yhteystiedot.map((yhteystieto, index) => (
                <Yhteystietokortti key={index} yhteystieto={yhteystieto} />
              ))}
            </ContentSpacer>
          )}
          <ContentSpacer>
            <H4>{t(`ladattava_kuulutus.otsikko`)}</H4>
            {kutsuPDFPath && vuorovaikutus?.vuorovaikutusJulkaisuPaiva && (
              <TiedostoLinkkiLista tiedostot={[kutsuPDFPath]} julkaisupaiva={vuorovaikutus?.vuorovaikutusJulkaisuPaiva} />
            )}
          </ContentSpacer>
        </>
      )}
    </Section>
  );
};

const TilaisuusLista: FunctionComponent<{
  tilaisuudet: VuorovaikutusTilaisuusJulkinen[];
  inaktiivinen?: true;
}> = ({ tilaisuudet, inaktiivinen }) => {
  const { t } = useTranslation("suunnittelu");

  const sortedTilaisuudet = useMemo(() => {
    return tilaisuudet.sort((a, b) => {
      if (dayjs(a.paivamaara).isBefore(dayjs(b.paivamaara))) {
        return -1;
      }
      if (dayjs(a.paivamaara).isAfter(dayjs(b.paivamaara))) {
        return 1;
      }
      return 0;
    });
  }, [tilaisuudet]);

  return (
    <div className="vayla-tilaisuus-list">
      {sortedTilaisuudet.map((tilaisuus, index) => {
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
              postitoimipaikka: tilaisuus.postitoimipaikka?.[kieli] ?? "",
            })}
          </p>
          {tilaisuus.lisatiedot?.[kieli] && (
            <p>
              <strong>{t("tilaisuudet.lisatiedot")}: </strong>
              {tilaisuus.lisatiedot?.[kieli]}
            </p>
          )}
        </KorttiContent>
      )}
      {tilaisuus && tilaisuus.tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && (
        <KorttiContent>
          <p>{t("tilaisuudet.soittoaika.soittoaikana_tavoitat")}</p>
          {tilaisuus.yhteystiedot?.map((yhteystieto, index) => (
            <Trans
              i18nKey="suunnittelu:tilaisuudet.soittoaika.yhteystieto"
              components={{ p: <p />, a: <StyledLink sx={{ fontWeight: 400 }} href={`tel:${yhteystieto.puhelinnumero}`} /> }}
              key={index}
              values={{ ...yhteystieto, organisaatioTeksti: muodostaOrganisaatioTeksti(yhteystieto, t, lang) }}
            />
          ))}
          {tilaisuus.lisatiedot?.[kieli] && (
            <p>
              <strong>{t("tilaisuudet.lisatiedot")}: </strong>
              {tilaisuus.lisatiedot?.[kieli]}
            </p>
          )}
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
          {tilaisuus.lisatiedot?.[kieli] && (
            <p>
              <strong>{t("tilaisuudet.lisatiedot")}: </strong>
              {tilaisuus.lisatiedot?.[kieli]}
            </p>
          )}
        </KorttiContent>
      )}
    </>
  );
}

const IconComponentForType: Record<VuorovaikutusTilaisuusTyyppi, OverridableComponent<SvgIconTypeMap> & { muiName: string }> = {
  [VuorovaikutusTilaisuusTyyppi.PAIKALLA]: LocationCityIcon,
  [VuorovaikutusTilaisuusTyyppi.SOITTOAIKA]: LocalPhoneIcon,
  [VuorovaikutusTilaisuusTyyppi.VERKOSSA]: HeadphonesIcon,
};

function TilaisuusIcon({ tyyppi, inactive }: { tyyppi: VuorovaikutusTilaisuusTyyppi; inactive?: true }) {
  const IconComponent = IconComponentForType[tyyppi];
  return <IconComponent sx={{ color: inactive ? "grey.500" : "primary.dark" }} />;
}

function TilaisuusTitle({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuusJulkinen }) {
  const { t } = useTranslation();
  return (
    <H5>
      {tilaisuus.tyyppi && `${t(`suunnittelu:tilaisuudet.tyyppi.${tilaisuus.tyyppi}`)}: `}
      {capitalize(t(`common:viikonpaiva_${dayjs(tilaisuus.paivamaara).day()}`))} {formatDate(tilaisuus.paivamaara)} {t("common:klo")}{" "}
      {tilaisuus.alkamisAika}-{tilaisuus.paattymisAika}
    </H5>
  );
}

function TilaisuusNimi({ tilaisuus }: { tilaisuus: VuorovaikutusTilaisuusJulkinen }) {
  const kieli = useKansalaiskieli();
  const nimi = tilaisuus.nimi?.[kieli];

  return (
    <KorttiContent>
      <p>
        <strong>{nimi ? upperFirst(nimi) : undefined}</strong>
      </p>
    </KorttiContent>
  );
}

export function Yhteystietokortti({ yhteystieto }: { yhteystieto: Yhteystieto }) {
  const { t, lang } = useTranslation();
  const { etunimi, sukunimi, puhelinnumero, sahkoposti, titteli } = yhteystieto;
  const organisaatioTeksti = muodostaOrganisaatioTeksti(yhteystieto, t, lang);
  const titteliText = titteli ? `, ${titteli},` : "";
  return (
    <YhteystietokorttiContent>
      <p>{`${etunimi} ${sukunimi}${titteliText}`}</p>
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
