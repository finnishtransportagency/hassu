import React, { useMemo, useState, VFC } from "react";
import { useController } from "react-hook-form";
import { Column } from "react-table";
import { ExternalStyledLink } from "@components/StyledLink";
import { formatDateTime } from "../../../../common/util/dateUtils";
import IconButton from "@components/button/IconButton";
import { useHassuTable } from "../../../hooks/useHassuTable";
import HassuTable from "@components/HassuTable";
import FileInput from "@components/form/FileInput";
import { KuulutusPDFInput, LadattuTiedosto, TallennaProjektiInput } from "../../../../common/graphql/apiModel";

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

const SaameTiedostoValitsin: VFC<SaameTiedostoValitsinProps> = (props) => {
  const {
    field: { onChange, value },
    fieldState,
  } = useController<KuulutustenLuonnosVaiheet, SaameTiedostoLomakePolku>({ name: props.name });

  const showUusiTiedosto = (value as any) instanceof File || !value;

  const [uusiTiedosto, setUusiTiedosto] = useState<OptionalNullableLadattuTiedosto | null>(null);

  const columns = useMemo<Column<OptionalNullableLadattuTiedosto>[]>(
    () => [
      {
        Header: "Tiedosto",
        width: 250,
        accessor: (tiedosto) => {
          const errorMessage = fieldState.error?.message;
          return (
            <>
              {typeof value === "string" ? <ExternalStyledLink href={value}>{tiedosto.nimi}</ExternalStyledLink> : tiedosto.nimi}
              {errorMessage && <p className="text-red">{errorMessage}</p>}
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (tiedosto) => (tiedosto.tuotu ? formatDateTime(tiedosto.tuotu) : undefined),
      },
      {
        Header: "Poista",
        accessor: () => {
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
      },
    ],
    [fieldState.error?.message, value, onChange]
  );

  const tiedosto: OptionalNullableLadattuTiedosto | null | undefined = showUusiTiedosto ? uusiTiedosto : props.tiedosto;

  const tableProps = useHassuTable<OptionalNullableLadattuTiedosto>({
    tableOptions: { columns, data: tiedosto ? [tiedosto] : [] },
  });
  return value ? (
    <HassuTable tableId={`${props.name}_table`} {...tableProps} />
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
