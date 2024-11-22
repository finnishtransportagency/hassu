import { LadattuTiedostoNew, SahkopostiVastaanottaja } from "@services/api";
import Section from "@components/layout/Section2";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { H2, H3, H4, H5 } from "@components/Headings";
import { formatDate, formatDateTimeIfExistsAndValidOtherwiseDash } from "common/util/dateUtils";
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
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ExtLink from "@components/ExtLink";

export default function EnnakkoneuvotteluLukutila({ projekti }: Readonly<{ projekti: ProjektiLisatiedolla }>) {
  const { oid, ennakkoNeuvotteluJulkaisu } = projekti;
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>([]);

  const kuntaMuistutukset = useMemo(() => {
    const kunnat = projekti.velho.kunnat ?? [];
    return kunnat.reduce<Record<string, LadattuTiedostoNew[]>>((acc, kunta) => {
      acc[kunta] =
        ennakkoNeuvotteluJulkaisu?.muistutukset
          ?.filter((muistutus) => muistutus.kunta === kunta)
          .map<LadattuTiedostoNew>(({ kunta, __typename, ...ladattavaTiedosto }) => ({
            __typename: "LadattuTiedostoNew",
            ...ladattavaTiedosto,
          })) ?? [];
      return acc;
    }, {});
  }, [ennakkoNeuvotteluJulkaisu?.muistutukset, projekti.velho.kunnat]);

  const { kategoriat, kategoriaIdt } = useMemo(() => {
    const kategoria = getAineistoKategoriat({ projektiTyyppi: projekti.velho?.tyyppi });
    return { kategoriat: kategoria.listKategoriat(), kategoriaIdt: kategoria.listKategoriaIds() };
  }, [projekti.velho?.tyyppi]);

  const url = ennakkoNeuvotteluJulkaisu?.hash
    ? `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${oid}/hyvaksymisesitysaineistot?hash=${ennakkoNeuvotteluJulkaisu.hash}`
    : undefined;

  return (
    <ProjektiPageLayout title="Ennakkotarkastus/ennakkoneuvottelu">
      <Section>
        <H2>Aineistolinkin sisältö</H2>
        <H5 sx={{ mt: 12 }}>Voimassaoloaika päättyy</H5>
        <p>{ennakkoNeuvotteluJulkaisu?.poistumisPaiva ? formatDate(ennakkoNeuvotteluJulkaisu?.poistumisPaiva) : "-"}</p>
      </Section>
      <Section noDivider>
        <H3>Viesti vastaanottajalle</H3>
        <H5>Lisätiedot</H5>
        <p>{ennakkoNeuvotteluJulkaisu?.lisatiedot || "-"}</p>
      </Section>
      <Section className="mb-4">
        <H2>Aineistolinkkiin liitettävä aineisto</H2>
        <H5 style={{ marginBottom: "0.5em" }}>Aineistolinkki</H5>
        {url ? <ExtLink href={url}>{url}</ExtLink> : <p>-</p>}
        {/* {ennakkoNeuvotteluJulkaisu?.hyvaksymisEsitys && (
          <>
            <H3>Hyväksymisesitys</H3>
            <ul style={{ listStyle: "none" }}>
              {ennakkoNeuvotteluJulkaisu.hyvaksymisEsitys.map((tiedosto, index) => (
                <li key={index}>
                  <TiedostoComponent tiedosto={tiedosto} />
                </li>
              ))}
            </ul>
          </>
        )} */}
        {ennakkoNeuvotteluJulkaisu?.suunnitelma && (
          <>
            <H3>Suunnitelma</H3>
            <AccordionToggleButton
              expandedAineisto={expandedAineisto}
              setExpandedAineisto={setExpandedAineisto}
              aineistoKategoriaIds={kategoriaIdt}
            />
            <NestedAineistoAccordion
              kategoriat={kategoriat}
              aineisto={ennakkoNeuvotteluJulkaisu.suunnitelma}
              paakategoria
              expandedState={[expandedAineisto, setExpandedAineisto]}
            />
          </>
        )}
      </Section>
      <Section className="pt-8">
        <H2>Vuorovaikutus</H2>
        <SectionContent>
          <H4>Muistutukset ({ennakkoNeuvotteluJulkaisu?.muistutukset?.length ?? 0})</H4>
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
                content: ennakkoNeuvotteluJulkaisu?.lausunnot?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {ennakkoNeuvotteluJulkaisu.lausunnot?.map((tiedosto, index) => (
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
                content: ennakkoNeuvotteluJulkaisu?.maanomistajaluettelo?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {ennakkoNeuvotteluJulkaisu?.maanomistajaluettelo?.map((tiedosto, index) => (
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
                content: ennakkoNeuvotteluJulkaisu?.kuulutuksetJaKutsu?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {ennakkoNeuvotteluJulkaisu?.kuulutuksetJaKutsu?.map((tiedosto, index) => (
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
                title: <H3 sx={{ margin: 0 }}>Projektivelho ({ennakkoNeuvotteluJulkaisu?.muuAineistoVelhosta?.length ?? 0})</H3>,
                content: ennakkoNeuvotteluJulkaisu?.muuAineistoVelhosta?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {ennakkoNeuvotteluJulkaisu.muuAineistoVelhosta?.map((tiedosto, index) => (
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
                title: <H3 sx={{ margin: 0 }}>Omalta koneelta ({ennakkoNeuvotteluJulkaisu?.muuAineistoKoneelta?.length ?? 0})</H3>,
                content: ennakkoNeuvotteluJulkaisu?.muuAineistoKoneelta?.length ? (
                  <ul style={{ listStyle: "none" }}>
                    {ennakkoNeuvotteluJulkaisu.muuAineistoKoneelta?.map((tiedosto, index) => (
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
      {ennakkoNeuvotteluJulkaisu?.vastaanottajat && (
        <Section>
          <H2>Hyväksymisesityksen vastaanottajat</H2>
          <SectionContent>
            <IlmoituksenVastaanottajatTable vastaanottajat={ennakkoNeuvotteluJulkaisu.vastaanottajat} />
          </SectionContent>
        </Section>
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

export function IlmoituksenVastaanottajatTable(props: Readonly<{ vastaanottajat: SahkopostiVastaanottaja[] }>) {
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
