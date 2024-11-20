import React, { MouseEventHandler, useCallback, useMemo, useState } from "react";
import Button from "@components/button/Button";
import { Checkbox, DialogActions, DialogContent, styled } from "@mui/material";
import HassuDialog, { HassuDialogProps } from "@components/HassuDialog";
import { SubmitHandler, useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import useApi from "src/hooks/useApi";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import * as Yup from "yup";
import ContentSpacer from "./layout/ContentSpacer";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { VelhoHakuTulos } from "@services/api";
import Notification, { NotificationType } from "./notification/Notification";
import HassuTable from "./table/HassuTable";
import { ColumnDef, createColumnHelper, getCoreRowModel, RowSelectionState, useReactTable } from "@tanstack/react-table";
import useTranslation from "next-translate/useTranslation";
import { TextFieldWithController } from "./form/TextFieldWithController";
import useSnackbars from "src/hooks/useSnackbars";
import { H5 } from "./Headings";

type JaaProjektiFormValues = {
  projektinNimi: string;
};

type JaaProjektiOsiinDialog = {
  onClose: HassuDialogProps["onClose"];
  open: HassuDialogProps["open"];
  oid: string;
  versio: number;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
};

const PROJEKTI_NIMI_MAX_LENGTH = 100;
const PROJEKTI_NIMI_MIN_LENGTH = 3;

const schema = Yup.object().shape({
  projektinNimi: Yup.string().required("Nimi on pakollinen kenttä.").min(PROJEKTI_NIMI_MIN_LENGTH, `Syötä vähintään kolme merkkiä.`),
});

enum SearchError {
  NO_RESULTS = "NO_RESULTS",
  SEARCH_UNSUCCESSFUL = "SEARCH_UNSUCCESSFUL",
}

const hakuVirheet = {
  NO_RESULTS:
    "Hakuehdoilla ei löytynyt yhtään suunnitelmaa. Tarkista hakuehdot ja varmista, että suunnitelma on tallennettu Projektivelhoon.",
  SEARCH_UNSUCCESSFUL: "Haku epäonnistui. Mikäli ongelma jatkuu, ota yhteys järjestelmän ylläpitäjään.",
};

export function JaaProjektiOsiinDialog(props: JaaProjektiOsiinDialog) {
  const defaultValues: JaaProjektiFormValues = useMemo(
    () => ({ oid: props.oid, targetOid: "", projektinNimi: "", versio: props.versio }),
    [props.oid, props.versio]
  );
  const formOptions: UseFormProps<JaaProjektiFormValues> = {
    resolver: yupResolver(schema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  };
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const targetOid: string | undefined = useMemo(() => {
    const selectedOids = Object.entries(rowSelection)
      .filter(([_key, selected]) => !!selected)
      .map(([key]) => key);
    if (selectedOids.length === 1) {
      return selectedOids[0];
    } else {
      return undefined;
    }
  }, [rowSelection]);

  const { handleSubmit, control } = useForm<JaaProjektiFormValues>(formOptions);
  const api = useApi();

  const { withLoadingSpinner } = useLoadingSpinner();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();

  const [hakuTulos, setHakuTulos] = useState<VelhoHakuTulos[] | null>(null);
  const [searchError, setSearchError] = useState<SearchError | undefined>(undefined);

  const haeProjekteja: SubmitHandler<JaaProjektiFormValues> = useCallback(
    (data) => {
      withLoadingSpinner(
        (async () => {
          try {
            const tulos = await api.getVelhoSuunnitelmasByName(data.projektinNimi);
            setHakuTulos(tulos);
            setRowSelection({});
            if (tulos.length === 0) {
              setSearchError(SearchError.NO_RESULTS);
            } else {
              setSearchError(undefined);
            }
          } catch (e) {
            setSearchError(SearchError.SEARCH_UNSUCCESSFUL);
          }
        })()
      );
    },
    [api, withLoadingSpinner]
  );

  const jaaProjekti: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      if (!targetOid) {
        showErrorMessage("Kohdeprojektia ei ole valittu");
        return;
      }
      withLoadingSpinner(
        (async () => {
          try {
            await api.jaaProjekti(props.oid, props.versio, targetOid);
            await props.reloadProjekti();
            props?.onClose?.(event, "escapeKeyDown");
            showSuccessMessage("Projektin jakaminen osiin onnistui");
          } catch (e) {}
        })()
      );
    },
    [api, props, showErrorMessage, showSuccessMessage, targetOid, withLoadingSpinner]
  );

  return (
    <HassuDialog title="Projektin jakaminen osiin" maxWidth="lg" open={props.open} onClose={props.onClose}>
      <DialogContent>
        <ContentSpacer gap={7}>
          <ContentSpacer as="form" onSubmit={handleSubmit(haeProjekteja)} style={{ display: "contents" }} gap={7}>
            <ContentSpacer>
              <p>
                Hae projekti johon haluat jakaa tämän projektin. Projekti haetaan Projektivelhosta. Hakuehtona voit käyttää Projektivelhoon
                asetetun projektin nimeä, tai sen osaa. Jos etsimääsi projektia ei näy listassa, varmista, että se on tallennettu
                Projektivelhoon, ja että hakuehto on oikein. Huomioithan, että hakutuloksissa näytetään ainoastaan ne projektit joita ei ole
                vielä perustettu palveluun.
              </p>
              <p>
                Valitse projekti hakutuloksista ja jaa projekti osiin Jaa projekti osiin -painikkeella. Projekti perustetaan Valtion
                liikenneväylien suunnittelu -palveluun ja sille kopioidaan jaettavan projektin julkaisut.
              </p>
            </ContentSpacer>
            <TextFieldWithController
              label="Projektin nimi"
              inputProps={{ maxLength: PROJEKTI_NIMI_MAX_LENGTH }}
              controllerProps={{ name: "projektinNimi", control }}
            />
            <Button primary type="submit">
              Hae
            </Button>
          </ContentSpacer>
          {(hakuTulos || searchError) && (
            <>
              <H5 variant="h4">Hakutulokset</H5>
              {searchError && <Notification type={NotificationType.ERROR}>{hakuVirheet[searchError]}</Notification>}
              {!!hakuTulos?.length && <PerustaTable hakuTulos={hakuTulos} rowSelection={rowSelection} setRowSelection={setRowSelection} />}
            </>
          )}
        </ContentSpacer>
      </DialogContent>
      <DialogActions>
        <Button type="button" primary disabled={!targetOid} onClick={jaaProjekti}>
          Jaa projekti osiin
        </Button>
        <Button type="button" onClick={(event) => props.onClose?.(event, "escapeKeyDown")}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}

interface PerustaTableProps {
  hakuTulos: VelhoHakuTulos[];
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}

const Span = styled("span")({});

const columnHelper = createColumnHelper<VelhoHakuTulos>();
type OptionalString = string | null | undefined;
type HakuTulosColumnDef = ColumnDef<VelhoHakuTulos, OptionalString>;

const PerustaTable = ({ hakuTulos, rowSelection, setRowSelection }: PerustaTableProps) => {
  const { t } = useTranslation("velho-haku");

  const columns = useMemo(() => {
    const cols: HakuTulosColumnDef[] = [
      columnHelper.accessor("asiatunnus", {
        header: "Asiatunnus",
        id: "asiatunnus",
        meta: {
          widthFractions: 2,
          minWidth: 180,
        },
      }),
      columnHelper.accessor((projekti) => projekti.nimi as OptionalString, {
        header: "Nimi",
        id: "nimi",
        meta: {
          widthFractions: 4,
          minWidth: 400,
        },
      }),
      columnHelper.accessor(
        (projekti) => {
          const value = projekti.tyyppi;
          return value && t(`projekti:projekti-tyyppi.${value}`);
        },
        {
          header: "Tyyppi",
          id: "tyyppi",
          meta: {
            widthFractions: 2,
            minWidth: 180,
          },
        }
      ),
      columnHelper.accessor("projektiPaallikko", {
        header: "Projektipäällikkö",
        id: "projektiPaallikko",
        meta: {
          widthFractions: 2,
          minWidth: 180,
        },
      }),
      {
        id: "select",
        header: "Valitse",
        cell: ({ row }) => (
          <Span
            sx={{
              display: "flex",
              justifyContent: "left",
              position: { xs: "absolute", md: "unset" },
              top: { xs: "7px", md: "unset" },
              right: { xs: "7px", md: "unset" },
            }}
          >
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
              name={row.id ? `select_row_${row.id}` : undefined}
            />
          </Span>
        ),
        meta: { minWidth: 60, widthFractions: 1 },
      },
    ];
    return cols;
  }, [t]);

  const table = useReactTable({
    data: hakuTulos || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.oid,
    onRowSelectionChange: setRowSelection,
    state: { pagination: undefined, rowSelection },
    enableSorting: false,
    enableMultiRowSelection: false,
  });

  return <HassuTable table={table} />;
};
