import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import TextInput from "@components/form/TextInput";
import HassuTable from "@components/HassuTable";
import Section from "@components/layout/Section";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { Stack } from "@mui/material";
import { Aineisto, AineistoInput, AineistoTila } from "@services/api";
import find from "lodash/find";
import omit from "lodash/omit";
import React, { useMemo, useRef, useState } from "react";
import { FieldArrayWithId, useFieldArray, useFormContext } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { formatDateTime } from "common/util/dateUtils";
import { NahtavilleAsetettavatAineistotFormValues } from "./Muokkausnakyma";

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
        Liitä tämä lausuntopyyntoon. Linkki tallentuu kuulutuksen tietoihin niin, että se on poimittavissa sieltä kuulutuksen hyväksymisen
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
              showInfoMessage("Kopioitu!");
            } else {
              showErrorMessage("Ongelma kopioinnissa!");
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
  const { control, formState, register } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const { fields, update: updateFieldArray } = useFieldArray({ name: "lisaAineisto", control });
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

  const columns = useMemo<Column<FormAineisto>[]>(
    () => [
      {
        Header: "Aineisto",
        width: 250,
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          const errorMessage = (formState.errors.aineistoNahtavilla?.lisaAineisto?.[index] as any | undefined)?.message;
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <>
                <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
                {errorMessage && <p className="text-red">{errorMessage}</p>}
                <input type="hidden" {...register(`lisaAineisto.${index}.dokumenttiOid`)} />
                <input type="hidden" {...register(`lisaAineisto.${index}.nimi`)} />
              </>
            )
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) =>
          aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
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
    [enrichedFields, formState.errors.aineistoNahtavilla, register, fields, updateFieldArray]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields || [], initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
};
