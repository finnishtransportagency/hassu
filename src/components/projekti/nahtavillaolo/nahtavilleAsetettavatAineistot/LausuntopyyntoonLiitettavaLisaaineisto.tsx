import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import TextInput from "@components/form/TextInput";
import HassuTable from "@components/HassuTable";
import Section from "@components/layout/Section";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/suunnitteluvaihe/AineistojenValitseminenDialog";
import { VuorovaikutusFormValues } from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { Stack } from "@mui/material";
import { Aineisto } from "@services/api";
import { find } from "lodash";
import React, { useMemo, useRef, useState } from "react";
import { FieldArrayWithId, useFormContext, useFieldArray } from "react-hook-form";
import { Column } from "react-table";
import { useHassuTable } from "src/hooks/useHassuTable";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { formatDateTime } from "src/util/dateUtils";
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
    if (typeof window === "undefined") {
      return undefined;
    }
    return `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${projekti?.oid}/lausuntopyyntoaineistot?hash=${parametrit?.hash}&id=${parametrit?.nahtavillaoloVaiheId}&poistumisPaiva=${parametrit?.poistumisPaiva}`;
  }, [projekti]);

  return (
    <Section>
      <h4 className="vayla-small-title">Lausuntopyynt????n liitett??v?? lis??aineisto</h4>
      <p>
        Lausuntopyynt????n liitett??v???? lis??aineistoa ei julkaista palvelun julkisella puolelle. Linkki lausuntopyynt????n
        liitett??v????n aineistoon muodostuu, kun aineisto on tuotu Velhosta. Linkin takana oleva sis??lt?? muodostuu
        n??ht??ville asetetuista aineistoista sek?? lausuntopyynn??n lis??aineistosta.
      </p>
      {!!projekti?.oid && !!lisaAineisto?.length && <AineistoTable />}
      <Button type="button" onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistoja
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(newAineistot) => {
          const value = lisaAineisto || [];
          newAineistot.forEach((aineisto) => {
            if (!find(value, { dokumenttiOid: aineisto.dokumenttiOid })) {
              value.push({ ...aineisto, jarjestys: value.length });
            }
          });
          setValue("lisaAineisto", value);
        }}
      />
      <h5 className="vayla-smallest-title">Lausuntopyynt????n liitett??v?? linkki</h5>
      <p>
        Linkki tallentuu kuulutuksen tietoihin niin, ett?? se on poimittavissa sielt?? kuulutuksen t??ytt??misen j??lkeen.
      </p>
      <Stack direction="row" alignItems="end">
        <TextInput
          label="Linkki lausuntopyynt????n liitett??v????n aineistoon"
          style={{ flexGrow: 1 }}
          disabled
          value={linkHref}
          ref={linkRef}
        />
        <IconButton
          icon="copy"
          className="text-primary-dark"
          type="button"
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

type FormAineisto = FieldArrayWithId<
  VuorovaikutusFormValues,
  "suunnitteluVaihe.vuorovaikutus.esittelyaineistot",
  "id"
> &
  Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

const AineistoTable = () => {
  const { control, formState, register } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const { fields, remove } = useFieldArray({ name: "lisaAineisto", control });
  const { data: projekti } = useProjekti();

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = projekti?.nahtavillaoloVaihe?.lisaAineisto || [];
        const { tila, tuotu, tiedosto } =
          aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

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
            <>
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`lisaAineisto.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`lisaAineisto.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
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
    [enrichedFields, formState.errors.aineistoNahtavilla, register, remove]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields || [], initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
};
