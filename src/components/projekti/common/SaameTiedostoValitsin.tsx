import React, { useMemo, useState, VFC } from "react";
import { useController } from "react-hook-form";
import { ExternalStyledLink } from "@components/StyledLink";
import { formatDateTime } from "../../../../common/util/dateUtils";
import IconButton from "@components/button/IconButton";
import HassuTable from "@components/HassuTable2";
import FileInput from "@components/form/FileInput";
import { KuulutusPDFInput, LadattuTiedosto, TallennaProjektiInput } from "../../../../common/graphql/apiModel";
import { ColumnDef, createColumnHelper, getCoreRowModel, TableOptions } from "@tanstack/react-table";

type KuulutustenLuonnosVaiheet = Pick<
  TallennaProjektiInput,
  "aloitusKuulutus" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe" | "vuorovaikutusKierros"
>;

export type SaameKutsuTiedostoMetodi = "vuorovaikutusKierros.vuorovaikutusSaamePDFt";

export type SaameKuulutusTiedostotMetodi =
  | "aloitusKuulutus.aloituskuulutusSaamePDFt"
  | "nahtavillaoloVaihe.nahtavillaoloSaamePDFt"
  | "hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt";

type SaameTiedostoLomakePolku =
  | `${SaameKuulutusTiedostotMetodi}.POHJOISSAAME.${keyof KuulutusPDFInput}`
  | `${SaameKutsuTiedostoMetodi}.POHJOISSAAME`;

type SaameTiedostoValitsinProps = {
  name: SaameTiedostoLomakePolku;
  tiedosto: LadattuTiedosto | null | undefined;
};

type OptionalNullableLadattuTiedosto = Partial<{
  [K in keyof LadattuTiedosto]: LadattuTiedosto[K] | null;
}>;

const columnHelper = createColumnHelper<OptionalNullableLadattuTiedosto>();

const SaameTiedostoValitsin: VFC<SaameTiedostoValitsinProps> = (props) => {
  const {
    field: { onChange, value },
    fieldState,
  } = useController<KuulutustenLuonnosVaiheet, SaameTiedostoLomakePolku>({ name: props.name });

  const showUusiTiedosto = (value as any) instanceof File || !value;

  const [uusiTiedosto, setUusiTiedosto] = useState<OptionalNullableLadattuTiedosto | null>(null);

  const tiedosto: OptionalNullableLadattuTiedosto | null | undefined = showUusiTiedosto ? uusiTiedosto : props.tiedosto;

  const columns: ColumnDef<OptionalNullableLadattuTiedosto>[] = useMemo(() => {
    const cols: ColumnDef<OptionalNullableLadattuTiedosto>[] = [
      columnHelper.accessor((tiedosto) => "tiedosto.nimi", {
        // cell: (info) => {
        //   const errorMessage = fieldState.error?.message;
        //   return (
        //     <>
        //       {typeof value === "string" ? <ExternalStyledLink href={value}>{info.getValue()}</ExternalStyledLink> : info.getValue()}
        //       {errorMessage && <p className="text-red">{errorMessage}</p>}
        //     </>
        //   );
        // },
        header: "Tiedosto",
        id: "tiedosto",
        meta: {
          minWidth: 250,
        },
      }),
      columnHelper.accessor((tiedosto) => (tiedosto.tuotu ? formatDateTime(tiedosto.tuotu) : undefined) as any, {
        header: "Tuotu",
        id: "tuotu",
      }),
      columnHelper.display({
        header: "",
        id: "actions",
        cell: () => {
          return (
            <IconButton
              type="button"
              onClick={() => {
                onChange(null);
                setUusiTiedosto(null);
              }}
              icon="trash"
            />
          );
        },
      }),
    ];
    return cols;
  }, [fieldState.error?.message, onChange, value]);

  const tableOptions: TableOptions<OptionalNullableLadattuTiedosto> = useMemo(() => {
    const options: TableOptions<OptionalNullableLadattuTiedosto> = {
      columns,
      data: tiedosto ? [tiedosto] : [],
      defaultColumn: { cell: (cell) => cell.getValue() || "-" },
      state: { pagination: undefined },
      getCoreRowModel: getCoreRowModel(),
    };
    return options;
  }, [columns, tiedosto]);

  return value ? (
    <HassuTable tableOptions={tableOptions} />
  ) : (
    <FileInput
      noDropzone
      error={fieldState.error}
      maxFiles={1}
      buttonText="Hae tiedosto"
      onDrop={(files) => {
        const tiedosto = files[0];
        if (tiedosto) {
          onChange(tiedosto);
          setUusiTiedosto({ nimi: tiedosto.name });
        }
      }}
      onChange={(e) => {
        const tiedosto = e.target.files?.[0];
        if (tiedosto) {
          onChange(tiedosto);
          setUusiTiedosto({ nimi: tiedosto.name });
        }
      }}
    />
  );
};

export default SaameTiedostoValitsin;
