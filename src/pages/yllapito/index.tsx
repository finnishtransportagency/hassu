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

import { Column, SortingRule } from "react-table";
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
import { formatDate } from "src/util/dateUtils";
import { useHassuTable } from "src/hooks/useHassuTable";
import HassuTable from "@components/HassuTable";
import useApi from "src/hooks/useApi";

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

  const sortingRules = [{ id: jarjestysSarake, desc: !jarjestysKasvava }];

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
            sortingRules={sortingRules}
            tuloksienMaara={tuloksienMaarat[aktiivinenTabi]}
          />
        ) : (
          <p>Ei projekteja.</p>
        )}
      </Section>
      <HassuSpinner open={isLoading} />
    </>
  );
};

interface FrontPageTableProps {
  data: ProjektiHakutulosDokumentti[];
  tuloksienMaara: number;
  sivunumero: number;
  sortingRules: SortingRule<ProjektiHakutulosDokumentti>[];
  fetchProjektit: (input: ListaaProjektitInput) => Promise<void>;
  searchInput: ListaaProjektitInput | undefined;
}

const FrontPageTable = (props: FrontPageTableProps) => {
  const { data, tuloksienMaara, fetchProjektit, searchInput } = props;
  const { t } = useTranslation("projekti");

  const columns: Column<ProjektiHakutulosDokumentti>[] = useMemo(
    () => [
      { Header: "Nimi", accessor: "nimi", minWidth: 400, id: ProjektiSarake.NIMI },
      { Header: "Asiatunnus", accessor: "asiatunnus", id: ProjektiSarake.ASIATUNNUS },
      {
        Header: "Projektipäällikkö",
        accessor: "projektipaallikko",
        id: ProjektiSarake.PROJEKTIPAALLIKKO,
      },
      {
        Header: "Vastuuorganisaatio",
        accessor: (projekti) =>
          projekti.suunnittelustaVastaavaViranomainen && t(`projekti:vastaava-viranomainen.${projekti.suunnittelustaVastaavaViranomainen}`),
        id: ProjektiSarake.VASTUUORGANISAATIO,
      },
      {
        Header: "Vaihe",
        accessor: (projekti) => projekti.vaihe && t(`projekti:projekti-status.${projekti.vaihe}`),
        minWidth: 100,
        id: ProjektiSarake.VAIHE,
      },
      {
        Header: "Päivitetty",
        accessor: (projekti) => projekti.paivitetty && formatDate(projekti.paivitetty),
        minWidth: 100,
        id: ProjektiSarake.PAIVITETTY,
        sortDescFirst: true,
        sortType: "datetime",
      },
      { Header: "oid", accessor: "oid", disableSortBy: true },
    ],
    [t]
  );

  const tableProps = useHassuTable<ProjektiHakutulosDokumentti>({
    tableOptions: {
      data,
      columns,
      manualPagination: true,
      manualSortBy: true,
      pageCount: Math.ceil(tuloksienMaara / PAGE_SIZE),
      useControlledState: (state) => {
        return useMemo(
          () => ({
            ...state,
            pageIndex: props.sivunumero,
            sortBy: props.sortingRules,
            hiddenColumns: ["oid"],
          }),
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [state, props.sivunumero, props.sortingRules]
        );
      },
    },
    pageChanger: (page) => fetchProjektit({ ...searchInput, sivunumero: page }),
    sortByChanger: (sortBy) => {
      const { id, desc } = sortBy?.[0] || { id: DEFAULT_PROJEKTI_SARAKE, desc: !DEFAULT_JARJESTYS_KASVAVA };
      fetchProjektit({
        ...searchInput,
        sivunumero: 0,
        jarjestysSarake: id as ProjektiSarake,
        jarjestysKasvava: !desc,
      });
    },
    rowLink: (projekti) => `/yllapito/projekti/${encodeURIComponent(projekti.oid)}`,
    usePagination: true,
    useSortBy: true,
  });
  return <HassuTable {...tableProps} />;
};

export default VirkamiesHomePage;
