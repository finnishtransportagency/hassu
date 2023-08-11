import {
  ListaaProjektitInput,
  ProjektiHakutulos,
  ProjektiHakutulosDokumentti,
  ProjektiSarake,
  ProjektiTyyppi,
  Status,
  SuunnittelustaVastaavaViranomainen,
} from "@services/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Tabs from "@components/layout/tabs/Tabs";
import { useRouter } from "next/router";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import HassuSpinner from "@components/HassuSpinner";

import { ColumnDef, PaginationState, SortingState, createColumnHelper, getCoreRowModel } from "@tanstack/react-table";
import Section from "@components/layout/Section";
import SearchSection from "@components/layout/SearchSection";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import CheckBox from "@components/form/CheckBox";
import Button from "@components/button/Button";
import FormGroup from "@components/form/FormGroup";
import Select from "@components/form/Select";
import { Controller, useForm } from "react-hook-form";
import { ParsedUrlQuery } from "querystring";
import omitUnnecessaryFields from "src/util/omitUnnecessaryFields";
import HassuTable, { HassuTableProps } from "@components/HassuTable2";
import useApi from "src/hooks/useApi";
import { RiittamattomatOikeudetDialog } from "@components/virkamies/etusivu/RiittamattomatOikeudetDialog";
import { formatDate, isValidDate } from "common/util/dateUtils";

const DEFAULT_TYYPPI = ProjektiTyyppi.TIE;
const DEFAULT_PROJEKTI_SARAKE = ProjektiSarake.PAIVITETTY;
const DEFAULT_JARJESTYS_KASVAVA = false;
const PAGE_SIZE = 10;

const mapQueryToListaaProjektiInput = (query: ParsedUrlQuery): ListaaProjektitInput => {
  const result: ListaaProjektitInput = {};
  if (typeof query?.projektiTyyppi === "string" && Object.keys(ProjektiTyyppi).includes(query?.projektiTyyppi)) {
    result.projektiTyyppi = query.projektiTyyppi as ProjektiTyyppi;
  }
  if (query?.nimi && typeof query?.nimi === "string") {
    result.nimi = query.nimi;
  }
  if (query?.asiatunnus && typeof query?.asiatunnus === "string") {
    result.asiatunnus = query.asiatunnus;
  }
  if (query?.vaylamuoto && typeof query.vaylamuoto === "string") {
    result.vaylamuoto = [query.vaylamuoto];
  }
  if (
    typeof query?.suunnittelustaVastaavaViranomainen === "string" &&
    Object.keys(SuunnittelustaVastaavaViranomainen).includes(query.suunnittelustaVastaavaViranomainen)
  ) {
    result.suunnittelustaVastaavaViranomainen = [query.suunnittelustaVastaavaViranomainen as SuunnittelustaVastaavaViranomainen];
  }
  if (typeof query?.vaihe === "string" && Object.keys(Status).includes(query.vaihe)) {
    result.vaihe = [query?.vaihe as Status];
  }
  if (query?.vainProjektitMuokkausOikeuksin === "true") {
    result.vainProjektitMuokkausOikeuksin = true;
  }
  if (typeof query?.sivunumero === "string" && !isNaN(+query.sivunumero)) {
    result.sivunumero = Math.floor(+query.sivunumero) - 1;
  }
  if (typeof query?.jarjestysSarake === "string" && Object.keys(ProjektiSarake).includes(query.jarjestysSarake)) {
    result.jarjestysSarake = query?.jarjestysSarake as ProjektiSarake;
  }
  if (query?.jarjestysKasvava === "true") {
    result.jarjestysKasvava = true;
  }
  if (query?.epaaktiivinen === "true") {
    result.epaaktiivinen = true;
  }
  return result;
};

const defaultFormData: ListaaProjektitInput = {
  nimi: "",
  asiatunnus: "",
  vaylamuoto: [""],
  // @ts-ignore
  suunnittelustaVastaavaViranomainen: [""],
  // @ts-ignore
  vaihe: [""],
  vainProjektitMuokkausOikeuksin: false,
};

const VirkamiesHomePage = () => {
  const api = useApi();
  const [sivunumero, setSivunumero] = useState(0);
  const [jarjestysKasvava, setJarjestysKasvava] = useState(DEFAULT_JARJESTYS_KASVAVA);
  const [jarjestysSarake, setJarjestysSarake] = useState(DEFAULT_PROJEKTI_SARAKE);
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulos>();
  const [searchInput, setSearchInput] = useState<ListaaProjektitInput>();
  const [isLoading, setIsLoading] = useState(true);
  const [unauthorizedProjekti, setUnauthorizedProjekti] = useState<ProjektiHakutulosDokumentti | null>(null);

  const closeUnauthorizedDialog = useCallback(() => {
    setUnauthorizedProjekti(null);
  }, []);

  const openUnauthorizedDialog = useCallback((projekti: ProjektiHakutulosDokumentti) => {
    setUnauthorizedProjekti(projekti);
  }, []);

  const { t } = useTranslation("projekti");
  const router = useRouter();

  const input = mapQueryToListaaProjektiInput(router.query);
  const { projektiTyyppi, epaaktiivinen } = input;
  const aktiivinenTabi = projektiTyyppi || (epaaktiivinen ? "epaaktiiviset" : "") || DEFAULT_TYYPPI;
  const { register, handleSubmit, reset, control } = useForm<ListaaProjektitInput>({ defaultValues: defaultFormData });

  const fetchProjektit = useCallback(
    async (input: ListaaProjektitInput) => {
      setIsLoading(true);
      const searchData = omitUnnecessaryFields(input);
      setSearchInput(searchData);
      setSivunumero(searchData.sivunumero || 0);
      setJarjestysKasvava(searchData.jarjestysKasvava || DEFAULT_JARJESTYS_KASVAVA);
      setJarjestysSarake(searchData.jarjestysSarake || DEFAULT_PROJEKTI_SARAKE);
      try {
        const result = await api.listProjektit(searchData);
        setHakutulos(result);
      } catch (e: any) {
        log.error("Error listing projektit", e);
        if (e.errors) {
          e.errors.map((err: any) => {
            const response = err.originalError?.response;
            const httpStatus = response?.status;
            log.error("HTTP Status: " + httpStatus + "\n" + err.stack);
          });
        }
        setHakutulos({ __typename: "ProjektiHakutulos" });
      }
      setIsLoading(false);
    },
    [api]
  );

  // This useEffect reads router.query and resets formdata and does datafetching
  // This routing triggers only once as searchInput is initially set to undefined and 'falsy' values are never assigned to it
  useEffect(() => {
    if (router.isReady && !searchInput) {
      const input = mapQueryToListaaProjektiInput(router.query);
      const { sivunumero, projektiTyyppi, jarjestysKasvava, jarjestysSarake, sivunKoko, epaaktiivinen, ...resetData } = input;
      reset({ ...defaultFormData, ...resetData });
      fetchProjektit(input);
    }
  }, [router, reset, searchInput, fetchProjektit]);

  const onSubmit = (data: ListaaProjektitInput) => {
    if (epaaktiivinen) {
      fetchProjektit({ ...data, epaaktiivinen: true, sivunumero: 0 });
    } else {
      fetchProjektit({ ...data, projektiTyyppi: projektiTyyppi, sivunumero: 0 });
    }
  };

  const tuloksienMaarat = {
    [ProjektiTyyppi.TIE]: hakutulos?.tiesuunnitelmatMaara || 0,
    [ProjektiTyyppi.RATA]: hakutulos?.ratasuunnitelmatMaara || 0,
    [ProjektiTyyppi.YLEINEN]: hakutulos?.yleissuunnitelmatMaara || 0,
    epaaktiiviset: hakutulos?.epaaktiivisetMaara || 0,
  };

  const statusOptions: Status[] = [
    Status.EI_JULKAISTU,
    Status.ALOITUSKUULUTUS,
    Status.SUUNNITTELU,
    Status.NAHTAVILLAOLO,
    Status.HYVAKSYMISMENETTELYSSA,
    Status.HYVAKSYTTY,
  ];

  return (
    <>
      <h1 className="vayla-title">Projektit</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <SearchSection noDivider>
          <h3 className="vayla-subtitle">Etsi projekteja</h3>
          <HassuGrid cols={{ xs: 1, md: 2, lg: 3, xl: 4 }}>
            <TextInput label="Projektin nimi" {...register("nimi")} />
            <TextInput label="Asiatunnus" {...register("asiatunnus")} />
            <Select label="Maakunta" disabled options={[]} addEmptyOption />
            <Controller
              control={control}
              name="vaylamuoto"
              render={({ field: { value, onChange, ...field } }) => (
                <Select
                  label="Väylämuoto"
                  options={["tie", "rata"].map((muoto) => ({
                    label: t(`projekti-vayla-muoto.${muoto}`),
                    value: muoto,
                  }))}
                  addEmptyOption
                  value={value?.[0]}
                  onChange={(event) => onChange([event.target.value])}
                  {...field}
                />
              )}
            />
            <Controller
              control={control}
              name="suunnittelustaVastaavaViranomainen"
              render={({ field: { value, onChange, ...field } }) => (
                <Select
                  label="Suunnittelusta vastaava viranomainen"
                  options={Object.values(SuunnittelustaVastaavaViranomainen).map((viranomainen) => ({
                    value: viranomainen,
                    label: t(`vastaava-viranomainen.${viranomainen}`),
                  }))}
                  addEmptyOption
                  value={value?.[0]}
                  onChange={(event) => onChange([event.target.value])}
                  {...field}
                />
              )}
            />
            <Controller
              control={control}
              name="vaihe"
              render={({ field: { value, onChange, ...field } }) => (
                <Select
                  style={epaaktiivinen ? { textDecoration: "line-through" } : {}}
                  label="Vaihe"
                  options={statusOptions.map((status) => ({
                    value: status,
                    label: t(`projekti-status.${status}`),
                  }))}
                  addEmptyOption
                  disabled={!!epaaktiivinen}
                  value={value?.[0]}
                  onChange={(event) => onChange([event.target.value])}
                  {...field}
                />
              )}
            />
            <FormGroup style={{ marginTop: "auto" }} inlineFlex>
              <CheckBox label="Vain projektit, joihin muokkausoikeudet" {...register("vainProjektitMuokkausOikeuksin")} />
            </FormGroup>
          </HassuGrid>
          <Button id="search" endIcon={"search"} primary type="submit">
            Hae
          </Button>
        </SearchSection>
      </form>
      <Section noDivider>
        <Tabs
          value={aktiivinenTabi}
          onChange={(_, value) => {
            if (value === "epaaktiiviset") {
              router.push({ query: { epaaktiivinen: "true" } }, undefined, { scroll: false });
              fetchProjektit({ ...searchInput, projektiTyyppi: null, epaaktiivinen: true, sivunumero: 0 });
            } else {
              const projektiTyyppi = value as ProjektiTyyppi;
              router.push({ query: { projektiTyyppi: projektiTyyppi } }, undefined, { scroll: false });
              fetchProjektit({ ...searchInput, epaaktiivinen: false, projektiTyyppi, sivunumero: 0 });
            }
          }}
          tabs={[
            {
              label:
                "Tiesuunnitelmat" + (hakutulos?.hasOwnProperty("tiesuunnitelmatMaara") ? ` (${tuloksienMaarat[ProjektiTyyppi.TIE]})` : ""),
              value: ProjektiTyyppi.TIE,
            },
            {
              label:
                "Ratasuunnitelmat" +
                (hakutulos?.hasOwnProperty("ratasuunnitelmatMaara") ? ` (${tuloksienMaarat[ProjektiTyyppi.RATA]})` : ""),
              value: ProjektiTyyppi.RATA,
            },
            {
              label:
                "Yleissuunnitelmat" +
                (hakutulos?.hasOwnProperty("yleissuunnitelmatMaara") ? ` (${tuloksienMaarat[ProjektiTyyppi.YLEINEN]})` : ""),
              value: ProjektiTyyppi.YLEINEN,
            },
            {
              label: "Epäaktiiviset" + (hakutulos?.hasOwnProperty("epaaktiivisetMaara") ? ` (${tuloksienMaarat.epaaktiiviset})` : ""),
              value: "epaaktiiviset",
            },
          ]}
        />
        {hakutulos?.tulokset?.length ? (
          <FrontPageTable
            data={hakutulos?.tulokset || []}
            fetchProjektit={fetchProjektit}
            searchInput={searchInput}
            sivunumero={sivunumero}
            jarjestysKasvava={jarjestysKasvava}
            jarjestysSarake={jarjestysSarake}
            tuloksienMaara={tuloksienMaarat[aktiivinenTabi]}
            openUnauthorizedDialog={openUnauthorizedDialog}
          />
        ) : (
          <p>Ei projekteja.</p>
        )}
      </Section>
      <RiittamattomatOikeudetDialog projekti={unauthorizedProjekti} onClose={closeUnauthorizedDialog} />
      <HassuSpinner open={isLoading} />
    </>
  );
};

const columnHelper = createColumnHelper<ProjektiHakutulosDokumentti>();

interface FrontPageTableProps {
  data: ProjektiHakutulosDokumentti[];
  tuloksienMaara: number;
  sivunumero: number;
  jarjestysSarake: ProjektiSarake;
  jarjestysKasvava: boolean;
  fetchProjektit: (input: ListaaProjektitInput) => Promise<void>;
  searchInput: ListaaProjektitInput | undefined;
  openUnauthorizedDialog: (projekti: ProjektiHakutulosDokumentti) => void;
}

type DokumenttiColumnDef = ColumnDef<ProjektiHakutulosDokumentti, string | null | undefined>;

const FrontPageTable = (props: FrontPageTableProps) => {
  const { data, tuloksienMaara, fetchProjektit, searchInput, sivunumero, jarjestysKasvava, jarjestysSarake } = props;
  const { t } = useTranslation("projekti");

  const sorting: SortingState = useMemo(() => [{ id: jarjestysSarake, desc: !jarjestysKasvava }], [jarjestysKasvava, jarjestysSarake]);

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: sivunumero,
      pageSize: 10,
    }),
    [sivunumero]
  );

  const columns: DokumenttiColumnDef[] = useMemo(() => {
    const cols: DokumenttiColumnDef[] = [
      columnHelper.accessor("nimi", {
        header: "Nimi",
        id: ProjektiSarake.NIMI,
        meta: {
          widthFractions: 5,
          minWidth: 300,
        },
      }),
      columnHelper.accessor("asiatunnus", {
        header: "Asiatunnus",
        id: ProjektiSarake.ASIATUNNUS,
        meta: {
          widthFractions: 3,
        },
      }),
      columnHelper.accessor("projektipaallikko", {
        header: "Projektipäällikkö",
        id: ProjektiSarake.PROJEKTIPAALLIKKO,
        meta: {
          widthFractions: 3,
        },
      }),
      columnHelper.accessor(
        (projekti) => {
          const value = projekti.suunnittelustaVastaavaViranomainen;
          return value && t(`projekti:vastaava-viranomainen.${value}`);
        },
        {
          header: "Vastuuorganisaatio",
          id: ProjektiSarake.VASTUUORGANISAATIO,
          meta: {
            widthFractions: 3,
          },
        }
      ),
      columnHelper.accessor(
        (projekti) => {
          const value = projekti.vaihe;
          return value ? t(`projekti:projekti-status.${value}`) : undefined;
        },
        {
          header: "Vaihe",
          id: ProjektiSarake.VAIHE,
          meta: { widthFractions: 2 },
        }
      ),
      columnHelper.accessor(
        ({ paivitetty }) => {
          const value = paivitetty && isValidDate(paivitetty) ? formatDate(paivitetty) : undefined;
          return value as string | null | undefined;
        },
        { header: "Päivitetty", id: ProjektiSarake.PAIVITETTY, sortDescFirst: true, meta: { widthFractions: 2 } }
      ),
    ];
    return cols;
  }, [t]);

  const tableProps: HassuTableProps<ProjektiHakutulosDokumentti> = useMemo(() => {
    const options: HassuTableProps<ProjektiHakutulosDokumentti> = {
      tableOptions: {
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: "onChange",
        pageCount: Math.ceil(tuloksienMaara / PAGE_SIZE),
        state: {
          pagination,
          sorting,
        },
        manualPagination: true,
        manualSorting: true,
        defaultColumn: { cell: (cell) => cell.getValue() || "-" },
        onPaginationChange: async (updater) => {
          const { pageIndex } = typeof updater === "function" ? updater(pagination) : updater;
          const listaaProjektiInput: ListaaProjektitInput = searchInput || {};
          await fetchProjektit({ ...listaaProjektiInput, sivunumero: pageIndex });
        },
        onSortingChange: async (updater) => {
          const sortingRules = typeof updater === "function" ? updater(sorting) : updater;
          const { id, desc } = sortingRules?.[0] || { id: DEFAULT_PROJEKTI_SARAKE, desc: !DEFAULT_JARJESTYS_KASVAVA };
          const listaaProjektiInput: ListaaProjektitInput = searchInput || {};
          await fetchProjektit({ ...listaaProjektiInput, jarjestysKasvava: !desc, jarjestysSarake: id as ProjektiSarake });
        },
      },
      rowLink: (row) => `/yllapito/projekti/${encodeURIComponent(row.original.oid)}`,
      rowOnClick: (event, row) => {
        const projekti = row.original;
        if (!projekti.oikeusMuokata) {
          event.preventDefault();
          props.openUnauthorizedDialog(projekti);
        }
      },
    };
    return options;
  }, [columns, data, fetchProjektit, pagination, props, searchInput, sorting, tuloksienMaara]);

  return <HassuTable {...tableProps} />;
};

export default VirkamiesHomePage;
