import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import TextInput from "@components/form/TextInput";
import HassuTable from "@components/table/HassuTable";
import Section from "@components/layout/Section";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { Stack } from "@mui/material";
import { Aineisto, AineistoInput, AineistoTila } from "@services/api";
import find from "lodash/find";
import omit from "lodash/omit";
import React, { ComponentProps, useCallback, useMemo, useRef, useState } from "react";
import { FieldArrayWithId, UseFieldArrayRemove, UseFieldArrayReturn, useFieldArray, useFormContext } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { formatDateTime } from "common/util/dateUtils";
import { NahtavilleAsetettavatAineistotFormValues } from "./Muokkausnakyma";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";

export default function LausuntopyyntoonLiitettavaLisaaineisto() {
  const { data: projekti } = useProjekti();
  const { watch, setValue } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const lisaAineisto = watch("lisaAineisto");
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const { showInfoMessage, showErrorMessage } = useSnackbars();

  const linkHref = useMemo(() => {
    const parametrit = projekti?.nahtavillaoloVaihe?.lisaAineistoParametrit;
    if (typeof window === "undefined" || !parametrit) {
      return undefined;
    }
    return `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${projekti?.oid}/lausuntopyyntoaineistot?hash=${parametrit?.hash}&id=${parametrit?.nahtavillaoloVaiheId}&poistumisPaiva=${parametrit?.poistumisPaiva}`;
  }, [projekti]);

  return (
    <Section>
      <h4 className="vayla-small-title">Lausuntopyyntöön liitettävä lisäaineisto</h4>
      <p>
        Lausuntopyyntöön liitettävää lisäaineistoa ei julkaista palvelun julkisella puolelle. Linkki lausuntopyyntöön liitettävään
        aineistoon muodostuu automaattisesti, kun aineisto on tuotu Projektivelhosta. Linkin takana oleva sisältö on koostettu nähtäville
        asetetuista aineistoista sekä lausuntopyynnön lisäaineistosta.
      </p>
      {!!projekti?.oid && !!lisaAineisto?.length && <AineistoTable />}
      <Button type="button" id="open_lisaaineisto_button" onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        onClose={() => setAineistoDialogOpen(false)}
        infoText="Valitse tiedostot, jotka haluat tuoda
        lisäaineistoksi."
        onSubmit={(velhoAineistot) => {
          const value = lisaAineisto || [];
          velhoAineistot
            .filter((aineisto) => !find(value, { dokumenttiOid: aineisto.oid }))
            .map<AineistoInput>((velhoAineisto) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
            }))
            .forEach((newAineisto) => {
              value.push({ ...newAineisto, jarjestys: value.length });
            });
          setValue("lisaAineisto", value, { shouldDirty: true });
        }}
      />
      <h5 className="vayla-smallest-title">Lausuntopyyntöön liitettävä linkki</h5>
      <p>
        Liitä tämä lausuntopyyntöön. Linkki tallentuu kuulutuksen tietoihin niin, että se on poimittavissa sieltä kuulutuksen hyväksymisen
        jälkeen.
      </p>
      <Stack direction="row" alignItems="end">
        <TextInput
          label="Linkki lausuntopyyntöön liitettävään aineistoon"
          style={{ flexGrow: 1 }}
          disabled
          value={linkHref || "-"}
          ref={linkRef}
        />
        <IconButton
          icon="copy"
          className="text-primary-dark"
          type="button"
          disabled={!linkHref}
          onClick={() => {
            if (!!linkRef.current?.value) {
              navigator.clipboard.writeText(linkRef.current.value);
              showInfoMessage("Kopioitu");
            } else {
              showErrorMessage("Ongelma kopioinnissa");
            }
          }}
        />
      </Stack>
    </Section>
  );
}

type FormAineisto = FieldArrayWithId<NahtavilleAsetettavatAineistotFormValues, "lisaAineisto", "id"> &
  Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

const AineistoTable = () => {
  const { control, formState, register, setValue } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const { fields, update: updateFieldArray, move, remove } = useFieldArray({ name: "lisaAineisto", control });
  const { data: projekti } = useProjekti();

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = projekti?.nahtavillaoloVaihe?.lisaAineisto || [];
        const { tila, tuotu, tiedosto } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { tila, tuotu, tiedosto, ...field };
      }),
    [fields, projekti]
  );

  const columns = useMemo<ColumnDef<FormAineisto>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250 },
        accessorFn: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          const errorMessage = (formState.errors.aineistoNahtavilla?.lisaAineisto?.[index] as any | undefined)?.message;
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <>
                <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} aineistoTila={aineisto.tila} />
                {errorMessage && <p className="text-red">{errorMessage}</p>}
                <input type="hidden" {...register(`lisaAineisto.${index}.dokumenttiOid`)} />
                <input type="hidden" {...register(`lisaAineisto.${index}.nimi`)} />
              </>
            )
          );
        },
      },
      {
        header: "Tuotu",
        accessorFn: (aineisto) =>
          aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      },
      {
        header: "",
        id: "actions",
        accessorFn: (aineisto) => {
          const index = fields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return <ActionsColumn fields={fields} index={index} remove={remove} updateFieldArray={updateFieldArray} sx={{}} />;
        },
        meta: { minWidth: 120 },
      },
    ],
    [enrichedFields, fields, formState.errors.aineistoNahtavilla?.lisaAineisto, register, remove, updateFieldArray]
  );

  const findRowIndex = useCallback(
    (id: string) => {
      return enrichedFields.findIndex((row) => row.id.toString() === id);
    },
    [enrichedFields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
      setValue(`lisaAineisto.${index}.jarjestys`, targetRowIndex);
      setValue(`lisaAineisto.${targetRowIndex}.jarjestys`, index);
      move(index, targetRowIndex);
    },
    [findRowIndex, move, setValue]
  );

  const tableOptions = useReactTable<FormAineisto>({
    columns,
    data: enrichedFields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.id,
    meta: { findRowIndex, onDragAndDrop, virtualization: { type: "window" } },
  });
  return <HassuTable table={tableOptions} />;
};

type ActionColumnProps = {
  fields: FieldArrayWithId<NahtavilleAsetettavatAineistotFormValues, `lisaAineisto`, "id">[];
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray: UseFieldArrayReturn<NahtavilleAsetettavatAineistotFormValues, `lisaAineisto`>["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

const ActionsColumn = styled(({ index, remove, updateFieldArray, fields, ...props }: ActionColumnProps) => {
  const dragRef = useTableDragConnectSourceContext();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          const field = omit(fields[index], "id");
          if (!field.tila) {
            remove(index);
          } else {
            field.tila = AineistoTila.ODOTTAA_POISTOA;
            updateFieldArray(index, field);
          }
        }}
        icon="trash"
      />
      <IconButton icon="equals" type="button" ref={dragRef} />
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
