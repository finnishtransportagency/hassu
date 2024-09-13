import React, { useState, FunctionComponent } from "react";
import { useController } from "react-hook-form";
import { ExternalStyledLink } from "@components/StyledLink";
import { formatDateTime } from "hassu-common/util/dateUtils";
import IconButton from "@components/button/IconButton";
import { DEFAULT_COL_MIN_WIDTH, DEFAULT_COL_WIDTH_FRACTIONS } from "@components/table/HassuTable";
import FileInput from "@components/form/FileInput";
import { KuulutusPDFInput, TiedotettavaKuulutusPDFInput, LadattuTiedosto, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import ContentSpacer from "@components/layout/ContentSpacer";
import {
  BodyTr,
  BodyTrWrapper,
  DataCell,
  DataCellContent,
  HeaderCell,
  HeaderCellContents,
  StyledTable,
  TableWrapper,
  Tbody,
  TbodyWrapper,
  Thead,
  Tr,
} from "@components/table/StyledTableComponents";
import { useIsAboveBreakpoint } from "src/hooks/useIsSize";

type KuulutustenLuonnosVaiheet = Pick<
  TallennaProjektiInput,
  "aloitusKuulutus" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe" | "vuorovaikutusKierros"
>;

export type SaameKutsuTiedostoPrefix = "vuorovaikutusKierros.vuorovaikutusSaamePDFt";

export type AloituskuulutusTiedostotPrefix = "aloitusKuulutus.aloituskuulutusSaamePDFt";

export type TiedotettavaKuulutusTiedostotPrefix =
  | "nahtavillaoloVaihe.nahtavillaoloSaamePDFt"
  | "hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt";

type SaameTiedostoLomakePolku =
  | `${AloituskuulutusTiedostotPrefix}.POHJOISSAAME.${keyof KuulutusPDFInput}`
  | `${TiedotettavaKuulutusTiedostotPrefix}.POHJOISSAAME.${keyof TiedotettavaKuulutusPDFInput}`
  | `${SaameKutsuTiedostoPrefix}.POHJOISSAAME`;

type SaameTiedostoValitsinProps = {
  name: SaameTiedostoLomakePolku;
  tiedosto: LadattuTiedosto | null | undefined;
};

type OptionalNullableLadattuTiedosto = Partial<{
  [K in keyof LadattuTiedosto]: LadattuTiedosto[K] | null;
}>;

const SaameTiedostoValitsin: FunctionComponent<SaameTiedostoValitsinProps> = (props) => {
  const {
    field: { onChange, value },
    fieldState,
  } = useController<KuulutustenLuonnosVaiheet, SaameTiedostoLomakePolku>({ name: props.name });

  const showUusiTiedosto = (value as any) instanceof File || !value;

  const [uusiTiedosto, setUusiTiedosto] = useState<OptionalNullableLadattuTiedosto | null>(null);

  const tiedosto: OptionalNullableLadattuTiedosto | null | undefined = showUusiTiedosto ? uusiTiedosto : props.tiedosto;

  const columns = [
    {
      header: "Tiedosto",
      id: "tiedosto",
      meta: {
        widthFractions: 3,
        minWidth: undefined,
      },
    },
    {
      header: "Tuotu",
      id: "tuotu",
      meta: { widthFractions: 3 },
    },
    {
      header: "",
      id: "actions",
    },
  ];

  const gridTemplateColumns = columns
    .map<string>((column) => {
      const minWidth = column.meta?.minWidth ?? DEFAULT_COL_MIN_WIDTH;
      const fractions = column.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS;
      return `minmax(${minWidth}px, ${fractions}fr)`;
    })
    .join(" ");

  const isMedium = useIsAboveBreakpoint("md");
  return value ? (
    <ContentSpacer gap={7} style={{ marginTop: "24px" }}>
      <TableWrapper>
        <StyledTable className="hassu-table" id="saametable">
          {isMedium && (
            <Thead className="hassu-table-head">
              <Tr sx={{ gridTemplateColumns, alignItems: "end" }}>
                {columns.map((header) => (
                  <HeaderCell key={header.id}>
                    <HeaderCellContents>{header.header}</HeaderCellContents>
                  </HeaderCell>
                ))}
              </Tr>
            </Thead>
          )}
          <TbodyWrapper>
            <Tbody>
              <BodyTrWrapper
                sx={{
                  borderBottom: "2px #49c2f1 solid",
                  backgroundColor: "#FFFFFF",
                }}
                data-index={0}
              >
                <BodyTr
                  sx={{
                    gridTemplateColumns,
                    opacity: 1,
                  }}
                >
                  <DataCell key="tiedosto">
                    <DataCellContent>
                      {typeof value === "string" ? (
                        <ExternalStyledLink href={value}>
                          <>{value.substring(value.lastIndexOf("/") + 1)}</>
                        </ExternalStyledLink>
                      ) : (
                        tiedosto?.nimi
                      )}
                    </DataCellContent>
                  </DataCell>
                  <DataCell key="tuotu">
                    <DataCellContent>{tiedosto?.tuotu ? formatDateTime(tiedosto.tuotu) : "-"}</DataCellContent>
                  </DataCell>
                  <DataCell key="actions">
                    <DataCellContent>
                      <IconButton
                        type="button"
                        onClick={() => {
                          onChange(null);
                          setUusiTiedosto(null);
                        }}
                        icon="trash"
                      />
                    </DataCellContent>
                  </DataCell>
                </BodyTr>
              </BodyTrWrapper>
            </Tbody>
          </TbodyWrapper>
        </StyledTable>
      </TableWrapper>
    </ContentSpacer>
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
