import { HyvaksymisEsityksenTiedot, HyvaksymisTila, LadattuTiedostoNew, SahkopostiVastaanottaja } from "@services/api";
import HyvaksyTaiPalautaPainikkeet from "./LomakeComponents/HyvaksyTaiPalautaPainikkeet";
import useKayttoOikeudet from "src/hooks/useKayttoOikeudet";
import Section from "@components/layout/Section2";
import Notification, { NotificationType } from "@components/notification/Notification";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useApi from "src/hooks/useApi";
import Button from "@components/button/Button";
import useSpinnerAndSuccessMessage from "src/hooks/useSpinnerAndSuccessMessage";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import { H2, H3, H4, H5 } from "@components/Headings";
import { formatDate, formatDateTimeIfExistsAndValidOtherwiseDash } from "common/util/dateUtils";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import useTranslation from "next-translate/useTranslation";
import TiedostoComponent from "@components/tiedosto";
import HassuAccordion from "@components/HassuAccordion";
import React, { Key, useMemo, useState } from "react";
import { kuntametadata } from "common/kuntametadata";
import SectionContent from "@components/layout/SectionContent";
import { lahetysTila } from "src/util/aloitusKuulutusUtil";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import HassuTable from "@components/table/HassuTable";
import { getAineistoKategoriat } from "common/aineistoKategoriat";
import { NestedAineistoAccordion } from "@components/NestedAineistoAccordion";
import { AccordionToggleButton } from "@components/projekti/common/Aineistot/AccordionToggleButton";
import ExtLink from "@components/ExtLink";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import { nyt, parseDate } from "backend/src/util/dateUtil";
import ButtonLink from "@components/button/ButtonLink";
import DownloadIcon from "@mui/icons-material/Download";

export default function HyvaksymisEsitysLukutila({
  hyvaksymisEsityksenTiedot,
}: Readonly<{ hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot }>) {
  const { mutate: reloadData } = useHyvaksymisEsitys();
  const { oid, versio, hyvaksymisEsitys, muokkauksenVoiAvata, perustiedot, tuodutTiedostot } = hyvaksymisEsityksenTiedot;
  const odottaaHyvaksyntaa = hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.tila == HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
  const invalidPoistumisPaiva =
    !hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.poistumisPaiva ||
    parseDate(hyvaksymisEsityksenTiedot.hyvaksymisEsitys.poistumisPaiva).isBefore(nyt(), "day");
  const { data: nykyinenKayttaja } = useKayttoOikeudet();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>([]);
  const api = useApi();

  const avaaMuokkaus = useSpinnerAndSuccessMessage(async () => {
    await api.avaaHyvaksymisEsityksenMuokkaus({ oid, versio });
    await reloadData();
  }, "Muokkauksen avaaminen onnistui");

  const { t } = useTranslation("common");

  const kuntaMuistutukset = useMemo(() => {
    const kunnat = perustiedot.kunnat ?? [];
    return kunnat.reduce<Record<string, LadattuTiedostoNew[]>>((acc, kunta) => {
      acc[kunta] =
        hyvaksymisEsitys?.muistutukset
          ?.filter((muistutus) => muistutus.kunta === kunta)
          .map<LadattuTiedostoNew>(({ kunta, __typename, ...ladattavaTiedosto }) => ({
            __typename: "LadattuTiedostoNew",
            ...ladattavaTiedosto,
          })) ?? [];
      return acc;
    }, {});
  }, [hyvaksymisEsitys?.muistutukset, perustiedot.kunnat]);

  const { kategoriat, kategoriaIdt } = useMemo(() => {
    const kategoria = getAineistoKategoriat({ projektiTyyppi: perustiedot.projektiTyyppi });
    return { kategoriat: kategoria.listKategoriat(), kategoriaIdt: kategoria.listKategoriaIds() };
  }, [perustiedot.projektiTyyppi]);

  if (!hyvaksymisEsitys) {
    return null;
  }

  const url = `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${oid}/hyvaksymisesitysaineistot?hash=${hyvaksymisEsitys.hash}`;

  const laskutustiedot = hyvaksymisEsitys.laskutustiedot;

  return (
    <ProjektiPageLayout
      title="Hyväksymisesitys"
      contentAsideTitle={
        muokkauksenVoiAvata ? (
          <Button onClick={avaaMuokkaus} id="avaa_hyvaksymisesityksen_muokkaus_button">
            Muokkaa
          </Button>
        ) : (
          <></>
        )
      }
    >
      {hyvaksymisEsitys.hyvaksymisPaiva && (
        <Section noDivider>
          <Notification type={NotificationType.INFO_GREEN}>
            Hyväksymisesitys on lähetetty vastaanottajalle {formatDate(hyvaksymisEsitys.hyvaksymisPaiva)}:{" "}
            <ExtLink href={url}>{url}</ExtLink>
          </Notification>
        </Section>
      )}
      {odottaaHyvaksyntaa && nykyinenKayttaja?.onProjektipaallikkoTaiVarahenkilo && !invalidPoistumisPaiva && (
        <Section noDivider>
          <Notification type={NotificationType.WARN}>
            Hyväksymisesitys odottaa hyväksyntää. Tarkista hyväksymisesitys ja a) hyväksy tai b) palauta hyväksymisesitys korjattavaksi, jos
            havaitset puutteita tai virheen.
          </Notification>
        </Section>
      )}
      {odottaaHyvaksyntaa && nykyinenKayttaja?.onProjektipaallikkoTaiVarahenkilo && invalidPoistumisPaiva && (
        <Section noDivider>
          <Notification type={NotificationType.ERROR}>
            Hyväksymisesityksen Voimassaoloaika päättyy -päivämäärä on menneisyydessä. Hyväksymisesitystä ei voi hyväksyä. Palauta
            hyväksymisesitys muokattavaksi, jotta päivämäärä voidaan korjata.
          </Notification>
        </Section>
      )}
      {odottaaHyvaksyntaa && nykyinenKayttaja?.omaaMuokkausOikeuden && !nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo && (
        <Section noDivider>
          <Notification type={NotificationType.WARN}>
            Hyväksymisesitys on hyväksyttävänä projektipäälliköllä. Jos hyväksymisesitystä tarvitsee muokata, ota yhteysprojektipäällikköön.
          </Notification>
        </Section>
      )}
      <H2>Hyväksymisesityksen sisältö</H2>
      <Section>
        <H5 sx={{ mt: 12 }}>Voimassaoloaika päättyy</H5>
        <p>{formatDate(hyvaksymisEsitys.poistumisPaiva)}</p>
      </Section>
      <Section noDivider>
        <H3>Viesti vastaanottajalle</H3>
        {!!hyvaksymisEsitys.kiireellinen && <H5>Pyydetään kiireellistä käsittelyä</H5>}
        {hyvaksymisEsitys.lisatiedot && (
          <>
            <H5>Lisätiedot</H5>
            <p>{hyvaksymisEsitys.lisatiedot}</p>
          </>
        )}
      </Section>
      <Section>
        <H3>Päätöksen hyväksymisen laskutustiedot</H3>
        <HassuGrid cols={3} sx={{ width: { lg: "70%", sm: "100%" }, rowGap: 0, marginTop: "2em", marginBottom: "2.5em" }}>
          <HassuGridItem colSpan={1}>
            <H5>Suunnitelman nimi</H5>
            <p>{perustiedot.suunnitelmanNimi || "-"}</p>
          </HassuGridItem>
          <HassuGridItem colSpan={2}>
            <H5>Asiatunnus</H5>
            <p>{perustiedot.asiatunnus || "-"}</p>
          </HassuGridItem>
          <HassuGridItem colSpan={1}>
            <H5>Vastuuorganisaatio</H5>
            <p>{perustiedot.vastuuorganisaatio ? t(`viranomainen.${perustiedot.vastuuorganisaatio}`) : "-"}</p>
          </HassuGridItem>
          <HassuGridItem colSpan={2}>
            <H5>Y-tunnus</H5>
            <p>{perustiedot.yTunnus || "-"}</p>
          </HassuGridItem>
          <HassuGridItem colSpan={1}>
            <H5>OVT-tunnus</H5>
            <p>{laskutustiedot?.ovtTunnus || "-"}</p>
          </HassuGridItem>
          <HassuGridItem colSpan={2}>
            <H5>Verkkolaskuoperaattorin välittäjätunnus</H5>
            <p>{laskutustiedot?.verkkolaskuoperaattorinTunnus || "-"}</p>
          </HassuGridItem>
          <HassuGridItem colSpan={3}>
            <H5>Viitetieto</H5>
            <p>{laskutustiedot?.viitetieto || "-"}</p>
          </HassuGridItem>
        </HassuGrid>
      </Section>
      <Section className="mb-4">
        <H2>Hyväksymisesitykseen liitettävä aineisto</H2>
        <H5 style={{ marginBottom: "0.5em" }}>Linkki hyväksymisesityksen aineistoon</H5>
        {url}
        <H3>Hyväksymisesitys</H3>
        <ul style={{ listStyle: "none" }}>
          {hyvaksymisEsitys.hyvaksymisEsitys?.map((tiedosto, index) => (
            <li key={index}>
              <TiedostoComponent tiedosto={tiedosto} />
            </li>
          ))}
        </ul>
        {hyvaksymisEsitys.suunnitelma && (
          <>
            <H3>Suunnitelma</H3>
            <AccordionToggleButton
              expandedAineisto={expandedAineisto}
              setExpandedAineisto={setExpandedAineisto}
              aineistoKategoriaIds={kategoriaIdt}
            />
            <NestedAineistoAccordion
              kategoriat={kategoriat}
              aineisto={hyvaksymisEsitys.suunnitelma}
              paakategoria
              expandedState={[expandedAineisto, setExpandedAineisto]}
            />
          </>
        )}
      </Section>
      <Section className="pt-8">
        <H2>Vuorovaikutus</H2>
        <SectionContent>
          <H4>Muistutukset ({hyvaksymisEsitys.muistutukset?.length ?? 0})</H4>
          <HassuAccordion
            style={{ marginTop: "0.5em" }}
            items={Object.keys(kuntaMuistutukset).map((kunta) => ({
              id: kunta,
              title: (
                <H5 sx={{ margin: 0 }}>
                  {kuntametadata.nameForKuntaId(parseInt(kunta), "fi")} ({kuntaMuistutukset[kunta]?.length ?? 0})
                </H5>
              ),
              content: kuntaMuistutukset[kunta]?.length ? (
                <ul style={{ listStyle: "none" }}>
                  {kuntaMuistutukset[kunta]?.map((tiedosto, index) => (
                    <li key={index}>
                      <TiedostoComponent tiedosto={tiedosto} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Ei muistutuksia</div>
              ),
            }))}
          />
          <HassuAccordion
            items={[
              {
                id: "2",
                title: <H4 sx={{ margin: 0 }}>Lausunnot</H4>,
                content: hyvaksymisEsitys.lausunnot?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {hyvaksymisEsitys.lausunnot?.map((tiedosto, index) => (
                      <li key={index}>
                        <TiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>Ei aineistoja</div>
                ),
              },
              {
                id: "3",
                title: <H4 sx={{ margin: 0 }}>Maanomistajaluettelo</H4>,
                content: hyvaksymisEsitys.maanomistajaluettelo?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {tuodutTiedostot.maanomistajaluettelo?.map((tiedosto, index) => (
                      <li key={index}>
                        <LadattavaTiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                    {hyvaksymisEsitys.maanomistajaluettelo?.map((tiedosto, index) => (
                      <li key={index}>
                        <TiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>Ei aineistoja</div>
                ),
              },
              {
                id: "4",
                title: <H4 sx={{ margin: 0 }}>Kuulutukset ja kutsu vuorovaikutukseen</H4>,
                content: hyvaksymisEsitys.kuulutuksetJaKutsu?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {tuodutTiedostot.kuulutuksetJaKutsu?.map((tiedosto, index) => (
                      <li key={index}>
                        <LadattavaTiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                    {hyvaksymisEsitys.kuulutuksetJaKutsu?.map((tiedosto, index) => (
                      <li key={index}>
                        <TiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>Ei aineistoja</div>
                ),
              },
            ]}
          />
        </SectionContent>
      </Section>
      <Section>
        <SectionContent>
          <H2>Muu tekninen aineisto</H2>
          <HassuAccordion
            items={[
              {
                id: "2",
                title: <H3 sx={{ margin: 0 }}>Projektivelho ({hyvaksymisEsitys.muuAineistoVelhosta?.length ?? 0})</H3>,
                content: hyvaksymisEsitys.muuAineistoVelhosta?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {hyvaksymisEsitys.muuAineistoVelhosta?.map((tiedosto, index) => (
                      <li key={index}>
                        <TiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>Ei aineistoja</div>
                ),
              },
              {
                id: "3",
                title: <H3 sx={{ margin: 0 }}>Omalta koneelta ({hyvaksymisEsitys.muuAineistoKoneelta?.length ?? 0})</H3>,
                content: hyvaksymisEsitys.muuAineistoKoneelta?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {hyvaksymisEsitys.muuAineistoKoneelta?.map((tiedosto, index) => (
                      <li key={index}>
                        <TiedostoComponent tiedosto={tiedosto} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>Ei aineistoja</div>
                ),
              },
            ]}
          />
        </SectionContent>
      </Section>
      <Section>
        <ButtonLink
          disabled={!hyvaksymisEsitys.aineistopaketti}
          href={hyvaksymisEsitys.aineistopaketti ? "/" + hyvaksymisEsitys.aineistopaketti : undefined}
        >
          Lataa kaikki
          <DownloadIcon className="ml-2" />
        </ButtonLink>
        {!hyvaksymisEsitys.aineistopaketti && <p className="text-red">Aineistopaketin luominen on vielä kesken.</p>}
      </Section>
      <Section>
        <H2>Hyväksymisesityksen vastaanottajat</H2>
        {hyvaksymisEsitys.vastaanottajat && (
          <SectionContent>
            <IlmoituksenVastaanottajatTable vastaanottajat={hyvaksymisEsitys.vastaanottajat} />
          </SectionContent>
        )}
      </Section>
      {odottaaHyvaksyntaa && nykyinenKayttaja?.onProjektipaallikkoTaiVarahenkilo && (
        <HyvaksyTaiPalautaPainikkeet
          oid={oid}
          versio={versio}
          vastaanottajat={hyvaksymisEsitys.vastaanottajat!}
          invalidPoistumisPaiva={invalidPoistumisPaiva}
        />
      )}
    </ProjektiPageLayout>
  );
}

const columns: ColumnDef<SahkopostiVastaanottaja>[] = [
  { accessorKey: "sahkoposti", id: "sahkoposti", header: "Sähköpostiosoite" },
  {
    accessorFn: (vo) => lahetysTila(vo),
    id: "ilmoituksenTila",
    header: "Ilmoituksen tila",
    cell: (info) => {
      return (
        <div
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            width: "fit-content",
            padding: 3,
            paddingLeft: "2em",
            paddingRight: "2em",
            borderRadius: 5,
            backgroundColor: info.getValue() == "Ei lähetetty" ? "lightgrey" : "#F5FFEF",
          }}
        >
          <>{info.getValue()}</>
        </div>
      );
    },
  },
  {
    accessorFn: (vo) => formatDateTimeIfExistsAndValidOtherwiseDash(vo.lahetetty),
    id: "lahetysAika",
    header: "Lähetysaika",
  },
];

function IlmoituksenVastaanottajatTable(props: Readonly<{ vastaanottajat: SahkopostiVastaanottaja[] }>) {
  const table = useReactTable({
    columns,
    getCoreRowModel: getCoreRowModel(),
    data: props.vastaanottajat,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
  });

  return <HassuTable table={table} />;
}
