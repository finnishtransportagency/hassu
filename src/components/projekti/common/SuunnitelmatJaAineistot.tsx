import Button from "@components/button/Button";
import ButtonFlat from "@components/button/ButtonFlat";
import IconButton from "@components/button/IconButton";
import Select, { SelectOption } from "@components/form/Select";
import HassuAccordion from "@components/HassuAccordion";
import HassuTable from "@components/HassuTable";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Aineisto, AineistoInput, AineistoTila, HyvaksymisPaatosVaihe, NahtavillaoloVaihe } from "@services/api";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "common/aineistoKategoriat";
import find from "lodash/find";
import omit from "lodash/omit";
import useTranslation from "next-translate/useTranslation";
import React, { Key, useCallback, useMemo, useState } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "common/util/dateUtils";
import HyvaksymisPaatosTiedostot from "../paatos/aineistot/HyvaksymisPaatosTiedostot";
import { AineistotSaavutettavuusOhje } from "./AineistotSaavutettavuusOhje";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

interface FormValues {
  aineistoNahtavilla: AineistoNahtavilla;
  hyvaksymisPaatos?: AineistoInput[];
}

const kategoriaInfoText: Record<string, string> = {
  osa_a: "Selostusosan alle tuodaan A- tai T100 -kansioiden aineistot.",
  osa_b: "Pääpiirustusten alle tuodaan B- tai T200 -kansioiden aineistot.",
  osa_c: "Informatiivisen aineiston alle tuodaan C- tai T300 -kansioiden aineistot.",
  kategorisoimattomat:
    "Kategorisoimattomat alle tuodaan kaikki aineistot, joita ei pystytty automaattisesti kategorisoimaan. Aineistot tulee siirtää Selostusosan-, Pääpiirustukset- tai Informatiivinen aineisto -kategorioiden alle. Pääset siirtymään kuulutukselle vasta, kun aineistot on siirretty ja Kategorisoimattomat on tyhjä.",
};

export interface PaatosAineistoTiedot {
  paatosSubtitle: string;
  paatosInfoText: string;
}

export interface SuunnitelmatJaAineistotProps {
  dialogInfoText: string;
  sectionTitle: string;
  sectionInfoText: string;
  sectionSubtitle?: string;
  paatos?: PaatosAineistoTiedot;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

function getInitialExpandedAineisto(aineistoNahtavilla: AineistoNahtavilla): Key[] {
  const keyArray = [];
  const hasKategorisoimattomatAineisto = !!aineistoNahtavilla[kategorisoimattomatId].length;
  if (hasKategorisoimattomatAineisto) {
    keyArray.push(kategorisoimattomatId);
  }
  return keyArray;
}

export default function SuunnitelmatJaAineistot({
  dialogInfoText,
  sectionTitle,
  sectionInfoText,
  paatos,
  sectionSubtitle,
  vaihe,
}: SuunnitelmatJaAineistotProps) {
  const { watch, setValue, getValues } = useFormContext<FormValues>();
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(aineistoNahtavilla));

  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  return (
    // TODO: kaytetaan myos hyvaksymisessa ja jatkopaatoksissa
    <Section>
      <h4 className="vayla-subtitle">{sectionTitle}</h4>
      <p>{sectionInfoText}</p>
      {<AineistotSaavutettavuusOhje />}

      {paatos && (
        <>
          <h5 className="vayla-small-title">{paatos.paatosSubtitle}</h5>
          <p>{paatos.paatosInfoText}</p>

          {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot />}

          <Button type="button" onClick={() => setPaatosDialogOpen(true)} id="tuo_paatos_button">
            Tuo päätös
          </Button>
          <AineistojenValitseminenDialog
            open={paatosDialogOpen}
            infoText="Valitse yksi tai useampi päätöstiedosto."
            onClose={() => setPaatosDialogOpen(false)}
            onSubmit={(velhoAineistot) => {
              const value = hyvaksymisPaatos || [];
              velhoAineistot
                .filter(({ oid }) => !find(value, { dokumenttiOid: oid }))
                .map<AineistoInput>((velhoAineisto) => ({
                  dokumenttiOid: velhoAineisto.oid,
                  nimi: velhoAineisto.tiedosto,
                }))
                .forEach((uusiAineisto) => {
                  value.push({ ...uusiAineisto, jarjestys: value.length });
                });
              setValue("hyvaksymisPaatos", value, { shouldDirty: true });
            }}
          />
        </>
      )}

      {sectionSubtitle && <h5 className="vayla-small-title">{sectionSubtitle}</h5>}

      <ButtonFlat
        type="button"
        onClick={() => {
          if (!!expandedAineisto.length) {
            setExpandedAineisto([]);
          } else {
            setExpandedAineisto(aineistoKategoriat.listKategoriaIds());
          }
        }}
        iconComponent={
          <span className="fa-layers">
            <FontAwesomeIcon icon="chevron-down" transform={`down-6`} flip={!!expandedAineisto.length ? "vertical" : undefined} />
            <FontAwesomeIcon icon="chevron-up" transform={`up-6`} flip={!!expandedAineisto.length ? "vertical" : undefined} />
          </span>
        }
      >
        {!!expandedAineisto.length ? "Sulje" : "Avaa"} kaikki kategoriat
      </ButtonFlat>
      <HassuAccordion
        expandedState={[expandedAineisto, setExpandedAineisto]}
        items={aineistoKategoriat.listKategoriat(true).map((paakategoria) => ({
          title: (
            <span className="vayla-small-title">{`${t(`aineisto-kategoria-nimi.${paakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
              aineistoNahtavillaFlat,
              paakategoria
            )})`}</span>
          ),
          content: (
            <SectionContent largeGaps>
              <SuunnitelmaAineistoPaakategoriaContent
                vaihe={vaihe}
                paakategoria={paakategoria}
                expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
                dialogInfoText={dialogInfoText}
              />
            </SectionContent>
          ),
          id: paakategoria.id,
        }))}
      />

      <Button type="button" id={"aineisto_nahtavilla_import_button"} onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText={dialogInfoText}
        onClose={async () => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const lomakkeenAineistot = Object.values(aineistoNahtavilla || {}).flat();

          const uudetAineistot = valitutVelhoAineistot
            .filter(({ oid }) => !find(lomakkeenAineistot, { dokumenttiOid: oid }))
            .map<AineistoInput>((aineisto) => ({
              dokumenttiOid: aineisto.oid,
              nimi: aineisto.tiedosto,
              kategoriaId: aineistoKategoriat.findKategoria(aineisto.kuvaus, aineisto.tiedosto)?.id,
            }));

          const uusiAineistoNahtavilla = uudetAineistot.reduce<AineistoNahtavilla>((uudetAineistot, aineisto) => {
            const kategoriaId = aineisto.kategoriaId || "kategorisoimattomat";
            if (!uudetAineistot[kategoriaId]) {
              uudetAineistot[kategoriaId] = [];
            }
            uudetAineistot[kategoriaId].push(aineisto);
            return uudetAineistot;
          }, Object.assign({}, aineistoNahtavilla));
          setValue(`aineistoNahtavilla`, uusiAineistoNahtavilla, { shouldDirty: true });

          const kategorisoimattomat = getValues(`aineistoNahtavilla.${kategorisoimattomatId}`);

          if (kategorisoimattomat?.length && !expandedAineisto.includes(kategorisoimattomatId)) {
            setExpandedAineisto([...expandedAineisto, kategorisoimattomatId]);
          }
        }}
      />
    </Section>
  );
}

interface SuunnitelmaAineistoPaakategoriaContentProps {
  paakategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  dialogInfoText: string;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const SuunnitelmaAineistoPaakategoriaContent = (props: SuunnitelmaAineistoPaakategoriaContentProps) => {
  const { data: projekti } = useProjekti();
  const { watch } = useFormContext<FormValues>();

  const aineistoNahtavilla = watch("aineistoNahtavilla");

  return (
    <>
      <p>{kategoriaInfoText[props.paakategoria.id]}</p>
      {!!projekti?.oid && !!aineistoNahtavilla[props.paakategoria.id]?.length && (
        <AineistoTable vaihe={props.vaihe} kategoriaId={props.paakategoria.id} />
      )}
      {props.paakategoria.alaKategoriat && (
        <SuunnitelmaAineistoAlakategoriaAccordion
          vaihe={props.vaihe}
          alakategoriat={props.paakategoria.alaKategoriat}
          expandedAineistoState={props.expandedAineistoState}
        />
      )}
    </>
  );
};

interface SuunnitelmaAineistoAlakategoriaAccordionProps {
  alakategoriat: AineistoKategoria[];
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const SuunnitelmaAineistoAlakategoriaAccordion = (props: SuunnitelmaAineistoAlakategoriaAccordionProps) => {
  const { watch } = useFormContext<FormValues>();
  const { t } = useTranslation("aineisto");
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const aineistojenMaara = props.alakategoriat.reduce((acc, cur) => {
    return acc + getNestedAineistoMaaraForCategory(aineistoNahtavillaFlat, cur);
  }, 0);

  if (!aineistojenMaara) {
    return null;
  }

  return (
    <HassuAccordion
      expandedState={props.expandedAineistoState}
      items={props.alakategoriat.map((alakategoria) => ({
        title: `${t(`aineisto-kategoria-nimi.${alakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
          aineistoNahtavillaFlat,
          alakategoria
        )})`,
        content: <AlakategoriaContent kategoria={alakategoria} vaihe={props.vaihe} expandedAineistoState={props.expandedAineistoState} />,
        id: alakategoria.id,
      }))}
    />
  );
};

interface AlakategoriaContentProps {
  kategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const AlakategoriaContent = (props: AlakategoriaContentProps) => {
  const { watch } = useFormContext<FormValues>();
  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.kategoria.id}`;
  const aineistot = watch(aineistoRoute);
  return (
    <>
      {!!aineistot?.length ? (
        <AineistoTable kategoriaId={props.kategoria.id} vaihe={props.vaihe} />
      ) : (
        <p>Kategoriaan ei ole asetettu aineistoa.</p>
      )}
      {!!props.kategoria.alaKategoriat?.length && (
        <SuunnitelmaAineistoAlakategoriaAccordion
          vaihe={props.vaihe}
          expandedAineistoState={props.expandedAineistoState}
          alakategoriat={props.kategoria.alaKategoriat}
        />
      )}
    </>
  );
};

type FormAineisto = FieldArrayWithId<FormValues, `aineistoNahtavilla.${string}`, "id"> & Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

interface AineistoTableProps {
  kategoriaId: string;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const AineistoTable = (props: AineistoTableProps) => {
  const { control, formState, register, getValues, setValue } = useFormContext<FormValues>();
  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.kategoriaId}`;
  const { fields, remove, update: updateFieldArray } = useFieldArray({ name: aineistoRoute, control });
  const { t } = useTranslation("aineisto");

  const getAllOptionsForKategoriat: (kategoriat: AineistoKategoria[], ylakategoriaNimi?: string) => SelectOption[] = useCallback(
    (kategoriat, ylakategoriaNimi) => {
      const ylakategoriaPrefix = ylakategoriaNimi ? `${ylakategoriaNimi} - ` : "";
      const kategoriaIds: SelectOption[] = [];
      kategoriat.forEach((kategoria) => {
        kategoriaIds.push({
          label: ylakategoriaPrefix + t(`aineisto-kategoria-nimi.${kategoria.id}`),
          value: kategoria.id,
        });
        if (kategoria.alaKategoriat) {
          kategoriaIds.push(
            ...getAllOptionsForKategoriat(kategoria.alaKategoriat, ylakategoriaPrefix + t(`aineisto-kategoria-nimi.${kategoria.id}`))
          );
        }
      });
      return kategoriaIds;
    },
    [t]
  );

  const allOptions = useMemo(() => getAllOptionsForKategoriat(aineistoKategoriat.listKategoriat(true)), [getAllOptionsForKategoriat]);

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = props.vaihe?.aineistoNahtavilla || []; //TODO: tarkista miksi tassa on hyvaksymispaatosvaihe
        const { tila, tuotu, tiedosto } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { tila, tuotu, tiedosto, ...field };
      }),
    [fields, props.vaihe?.aineistoNahtavilla]
  );

  const columns = useMemo<Column<FormAineisto>[]>(
    () => [
      {
        Header: "Aineisto",
        width: 250,
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          const errorpath = props.kategoriaId;
          const errorMessage = (formState.errors.aineistoNahtavilla?.[errorpath]?.[index] as any | undefined)?.message;
          return (
            <>
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} aineistoTila={aineisto.tila} />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) =>
          aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      },
      {
        Header: "Kategoria",
        accessor: (aineisto) => {
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <Select
                options={allOptions}
                defaultValue={props.kategoriaId}
                className="category_selector"
                onChange={(event) => {
                  const newKategoria = event.target.value;
                  if (newKategoria !== props.kategoriaId) {
                    const values = getValues(`aineistoNahtavilla.${newKategoria}`) || [];
                    const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);

                    if (!find(values, { dokumenttiOid: aineisto.dokumenttiOid })) {
                      values.push({
                        dokumenttiOid: aineisto.dokumenttiOid,
                        nimi: aineisto.nimi,
                        kategoriaId: newKategoria,
                        jarjestys: values.length,
                      });
                      setValue(`aineistoNahtavilla.${newKategoria}`, values);
                    }
                    remove(index);
                  }
                }}
              />
            )
          );
        },
      },
      {
        Header: "Poista",
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <IconButton
                type="button"
                onClick={() => {
                  const field = omit(fields[index], "id");
                  field.tila = AineistoTila.ODOTTAA_POISTOA;
                  updateFieldArray(index, field);
                }}
                icon="trash"
              />
            )
          );
        },
      },
      { Header: "id", accessor: "id" },
      { Header: "dokumenttiOid", accessor: "dokumenttiOid" },
    ],
    [
      aineistoRoute,
      enrichedFields,
      formState.errors.aineistoNahtavilla,
      getValues,
      props.kategoriaId,
      register,
      remove,
      setValue,
      allOptions,
      fields,
      updateFieldArray,
    ]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: {
      columns,
      data: enrichedFields || [],
      initialState: { hiddenColumns: ["dokumenttiOid", "id"] },
    },
  });
  return <HassuTable tableId={`${props.kategoriaId}_table`} {...tableProps} />;
};
