import React, { useState, FunctionComponent, useCallback } from "react";
import { useController } from "react-hook-form";
import { ExternalStyledLink } from "@components/StyledLink";
import { formatDateTime } from "hassu-common/util/dateUtils";
import IconButton from "@components/button/IconButton";
import { DEFAULT_COL_MIN_WIDTH, DEFAULT_COL_WIDTH_FRACTIONS } from "@components/table/HassuTable";
import FileInput from "@components/form/FileInput";
import { KuulutusPDFInput, LadattuTiedosto, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
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
import { FileSizeExceededLimitError, FileTypeNotAllowedError } from "common/error";
import useSnackbars from "src/hooks/useSnackbars";
import { validateTiedostoForUpload } from "src/util/fileUtil";

type KuulutustenLuonnosVaiheet = Pick<
  TallennaProjektiInput,
  "aloitusKuulutus" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe" | "vuorovaikutusKierros"
>;

export type SaameKutsuTiedostoPrefix = "vuorovaikutusKierros.vuorovaikutusSaamePDFt";

export type KuulutusTiedostotPrefix =
  | "aloitusKuulutus.aloituskuulutusSaamePDFt"
  | "jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt"
  | "jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt";

export type TiedotettavaKuulutusTiedostotPrefix =
  | "nahtavillaoloVaihe.nahtavillaoloSaamePDFt"
  | "hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt";

type SaameTiedostoLomakePolku =
  | `${KuulutusTiedostotPrefix}.POHJOISSAAME.${keyof KuulutusPDFInput}`
  | `${TiedotettavaKuulutusTiedostotPrefix}.POHJOISSAAME.${keyof KuulutusPDFInput}`
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
  const { showErrorMessage } = useSnackbars();

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

  const updateFileOnForm = useCallback(
    (tiedosto: File | undefined): void => {
      if (!tiedosto) {
        return;
      }

      try {
        validateTiedostoForUpload(tiedosto);
        onChange(tiedosto);
        setUusiTiedosto({ nimi: tiedosto.name });
      } catch (e) {
        if (e instanceof FileSizeExceededLimitError) {
          const filename = e.file?.name;
          const file = filename ? "Tiedosto '" + filename + "'" : "Tiedosto";
          showErrorMessage(`${file} ylittää 25 Mt maksimikoon.`);
        } else if (e instanceof FileTypeNotAllowedError) {
          const filename = e.file?.name;
          const file = filename ? "Tiedosto '" + filename + "'" : "Tiedosto";
          showErrorMessage(`${file} on väärää tiedostotyyppiä. Sallitut tyypit: pdf, jpg, png, doc, docx ja txt.`);
        } else {
          // Ei pitäisi tapahtua
          console.log("Tiedoston validointi epäonnistui", e);
          showErrorMessage("Tiedoston validointi epäonnistui.");
        }
      }
    },
    [onChange, showErrorMessage]
  );

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
      accept="application/pdf"
      buttonText="Hae tiedosto"
      onDrop={(files) => updateFileOnForm(files[0])}
      onChange={(e) => updateFileOnForm(e.target.files?.[0])}
    />
  );
};

export default SaameTiedostoValitsin;
