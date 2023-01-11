import Button from "@components/button/Button";
import ButtonFlat from "@components/button/ButtonFlat";
import IconButton from "@components/button/IconButton";
import Select, { SelectOption } from "@components/form/Select";
import HassuAccordion from "@components/HassuAccordion";
import HassuTable from "@components/HassuTable";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Notification, { NotificationType } from "@components/notification/Notification";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Aineisto, AineistoInput, HyvaksymisPaatosVaihe, NahtavillaoloVaihe } from "@services/api";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import { find } from "lodash";
import useTranslation from "next-translate/useTranslation";
import React, { Key, useCallback, useMemo, useState } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "src/util/dateUtils";
import HyvaksymisPaatosTiedostot from "../paatos/aineistot/HyvaksymisPaatosTiedostot";

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

export default function SuunnitelmatJaAineistot({
  dialogInfoText,
  sectionTitle,
  sectionInfoText,
  paatos,
  sectionSubtitle,
  vaihe,
}: SuunnitelmatJaAineistotProps) {
  const { watch, setValue } = useFormContext<FormValues>();
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");

  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>([]);
  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);

  return (
    // TODO: kaytetaan myos hyvaksymisessa ja jatkopaatoksissa
    <Section>
      <h4 className="vayla-subtitle">{sectionTitle}</h4>
      <p>{sectionInfoText}</p>
      <Notification type={NotificationType.INFO_GRAY}>
        Huomioithan, että suunnitelma-aineistojen tulee täyttää saavutettavuusvaatimukset.
      </Notification>

      {paatos && (
        <>
          <h5 className="vayla-small-title">{paatos.paatosSubtitle}</h5>
          <p>{paatos.paatosInfoText}</p>

          {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot />}

          <Button type="button" onClick={() => setAineistoDialogOpen(true)} id="tuo_paatos_button">
            Tuo päätös
          </Button>
          <AineistojenValitseminenDialog
            open={aineistoDialogOpen}
            infoText="Valitse yksi tai useampi päätöstiedosto."
            onClose={() => setAineistoDialogOpen(false)}
            onSubmit={(newAineistot) => {
              const value = hyvaksymisPaatos || [];
              newAineistot.forEach((aineisto) => {
                if (!find(value, { dokumenttiOid: aineisto.dokumenttiOid })) {
                  value.push({ ...aineisto, kategoriaId: null, jarjestys: value.length });
                }
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
        items={aineistoKategoriat.listKategoriat().map((paakategoria) => ({
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
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { setValue, watch } = useFormContext<FormValues>();

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
      <Button type="button" id={props.paakategoria.id + "_button"} onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistoja
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText={props.dialogInfoText}
        onClose={() => setAineistoDialogOpen(false)}
        ylakategoriaId={props.paakategoria.id}
        onSubmit={(selectedAineistot) => {
          const aineistotFlat = Object.values(aineistoNahtavilla || {}).flat();
          const muokatutKategoriat: AineistoNahtavilla = selectedAineistot
            .filter(({ dokumenttiOid }) => !find(aineistotFlat, { dokumenttiOid }))
            .reduce((accumulatedAineistot, aineisto) => {
              const kategoriaId = aineisto.kategoriaId || props.paakategoria.id;
              if (!accumulatedAineistot[kategoriaId]) {
                accumulatedAineistot[kategoriaId] = aineistoNahtavilla[kategoriaId];
              }
              accumulatedAineistot[kategoriaId].push({ ...aineisto, kategoriaId, jarjestys: accumulatedAineistot[kategoriaId].length });

              return accumulatedAineistot;
            }, {} as AineistoNahtavilla);

          Object.entries(muokatutKategoriat).forEach(([kategoriaId, kategorianAineistot]) => {
            setValue(`aineistoNahtavilla.${kategoriaId}`, kategorianAineistot, { shouldDirty: true });
          });
        }}
      />
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
  const { fields, remove } = useFieldArray({ name: aineistoRoute, control });
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

  const allOptions = useMemo(() => getAllOptionsForKategoriat(aineistoKategoriat.listKategoriat()), [getAllOptionsForKategoriat]);

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
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      },
      {
        Header: "Kategoria",
        accessor: (aineisto) => {
          return (
            <Select
              options={allOptions}
              defaultValue={props.kategoriaId}
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
          );
        },
      },
      {
        Header: "Poista",
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            <IconButton
              type="button"
              onClick={() => {
                remove(index);
              }}
              icon="trash"
            />
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
    ]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields || [], initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
};
