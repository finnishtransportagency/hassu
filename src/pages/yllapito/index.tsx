import {
  api,
  ListaaProjektitInput,
  ProjektiHakutulos,
  ProjektiHakutulosDokumentti,
  ProjektiTyyppi,
  Status,
  Viranomainen,
} from "@services/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Tabs from "@components/layout/tabs/Tabs";
import { useRouter } from "next/router";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import HassuSpinner from "@components/HassuSpinner";

import { styled, experimental_sx as sx } from "@mui/material";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import CheckBox from "@components/form/CheckBox";
import Button from "@components/button/Button";
import FormGroup from "@components/form/FormGroup";
import Select from "@components/form/Select";
import { Controller, useForm } from "react-hook-form";
import { ParsedUrlQuery } from "querystring";
import { omitBy } from "lodash";
import { formatDate } from "src/util/dateUtils";
import Table from "@components/Table";

const DEFAULT_TYYPPI = ProjektiTyyppi.TIE;

const mapQueryToListaaProjektiInput = (query: ParsedUrlQuery): ListaaProjektitInput => {
  const result: ListaaProjektitInput = { projektiTyyppi: DEFAULT_TYYPPI, sivunumero: 0 };
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
    Object.keys(Viranomainen).includes(query.suunnittelustaVastaavaViranomainen)
  ) {
    result.suunnittelustaVastaavaViranomainen = [query.suunnittelustaVastaavaViranomainen as Viranomainen];
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
  return result;
};

const mapListaaProjektiInputToQuery = (input: ListaaProjektitInput): ParsedUrlQuery => {
  const result: ParsedUrlQuery = {};
  if (input?.projektiTyyppi) {
    result.projektiTyyppi = input.projektiTyyppi;
  }
  if (input?.nimi) {
    result.nimi = input.nimi;
  }
  if (input?.asiatunnus) {
    result.asiatunnus = input.asiatunnus;
  }
  if (input?.vaylamuoto) {
    result.vaylamuoto = input.vaylamuoto;
  }
  if (input?.suunnittelustaVastaavaViranomainen) {
    result.suunnittelustaVastaavaViranomainen = input.suunnittelustaVastaavaViranomainen;
  }
  if (input?.vaihe) {
    result.vaihe = input.vaihe;
  }
  if (input?.vainProjektitMuokkausOikeuksin) {
    result.vainProjektitMuokkausOikeuksin = "true";
  }
  if (input?.sivunumero) {
    result.sivunumero = (input.sivunumero + 1).toString();
  }
  return result;
};

const omitUnnecessaryFields = <T extends object>(data: T) =>
  omitBy(
    data,
    (value) =>
      !value ||
      (Array.isArray(value) && (value.length === 0 || (value.length === 1 && (value as string[]).includes(""))))
  );

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

const PAGE_SIZE = 10;

const VirkamiesHomePage = () => {
  const [tyyppi, setTyyppi] = useState<ProjektiTyyppi>(DEFAULT_TYYPPI);
  const [sivunumero, setSivunumero] = useState(0);
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulos>();
  const [searchInput, setSearchInput] = useState<ListaaProjektitInput>();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation("projekti");
  const router = useRouter();

  const { register, handleSubmit, reset, control } = useForm<ListaaProjektitInput>({ defaultValues: defaultFormData });

  const fetchProjektit = useCallback(
    async (input: ListaaProjektitInput) => {
      setIsLoading(true);
      const searchData = omitUnnecessaryFields(input);
      setSearchInput(searchData);
      router.push({ query: mapListaaProjektiInputToQuery(searchData) }, undefined, { scroll: false });
      setTyyppi(searchData.projektiTyyppi || DEFAULT_TYYPPI);
      setSivunumero(searchData.sivunumero || 0);
      try {
        const result = await api.listProjektit(searchData);
        log.info("listProjektit:", result);
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
    [router]
  );

  // This useEffect reads router.query and resets formdata and does datafetching
  // This routing triggers only once as searchInput is initially set to undefined and 'falsy' values are never assigned to it
  useEffect(() => {
    if (router.isReady && !searchInput) {
      const input = mapQueryToListaaProjektiInput(router.query);
      const { sivunumero, projektiTyyppi, ...resetData } = input;
      reset({ ...defaultFormData, ...resetData });
      fetchProjektit(input);
    }
  }, [router, reset, searchInput, fetchProjektit]);

  const onSubmit = (data: ListaaProjektitInput) => {
    fetchProjektit({ ...data, projektiTyyppi: tyyppi, sivunumero: 0 });
  };

  const tuloksienMaarat = {
    [ProjektiTyyppi.TIE]: hakutulos?.tiesuunnitelmatMaara || 0,
    [ProjektiTyyppi.RATA]: hakutulos?.ratasuunnitelmatMaara || 0,
    [ProjektiTyyppi.YLEINEN]: hakutulos?.yleissuunnitelmatMaara || 0,
  };

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
                  options={Object.values(Viranomainen).map((viranomainen) => ({
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
                  label="Vaihe"
                  options={Object.values(Status).map((status) => ({
                    value: status,
                    label: t(`projekti-status.${status}`),
                  }))}
                  addEmptyOption
                  value={value?.[0]}
                  onChange={(event) => onChange([event.target.value])}
                  {...field}
                />
              )}
            />
            <FormGroup style={{ marginTop: "auto" }} inlineFlex>
              <CheckBox
                label="Vain projektit, joihin muokkausoikeudet"
                {...register("vainProjektitMuokkausOikeuksin")}
              />
            </FormGroup>
          </HassuGrid>
          <Button endIcon={"search"} primary type="submit">
            Hae
          </Button>
        </SearchSection>
      </form>
      <Section noDivider>
        <Tabs
          value={tyyppi}
          onChange={(_, value) => {
            const projektiTyyppi = value as ProjektiTyyppi;
            fetchProjektit({ ...searchInput, projektiTyyppi, sivunumero: 0 });
          }}
          tabs={[
            {
              label:
                "Tiesuunnitelmat" +
                (hakutulos?.hasOwnProperty("tiesuunnitelmatMaara") ? ` (${tuloksienMaarat[ProjektiTyyppi.TIE]})` : ""),
              value: ProjektiTyyppi.TIE,
            },
            {
              label:
                "Ratasuunnitelmat" +
                (hakutulos?.hasOwnProperty("ratasuunnitelmatMaara")
                  ? ` (${tuloksienMaarat[ProjektiTyyppi.RATA]})`
                  : ""),
              value: ProjektiTyyppi.RATA,
            },
            {
              label:
                "Yleissuunnitelmat" +
                (hakutulos?.hasOwnProperty("yleissuunnitelmatMaara")
                  ? ` (${tuloksienMaarat[ProjektiTyyppi.YLEINEN]})`
                  : ""),
              value: ProjektiTyyppi.YLEINEN,
            },
          ]}
        />
        {hakutulos?.tulokset?.length ? (
          <Table<ProjektiHakutulosDokumentti>
            tableOptions={{
              data: hakutulos?.tulokset || [],
              columns: [
                { Header: "Nimi", accessor: "nimi", minWidth: 400 },
                { Header: "Asiatunnus", accessor: "asiatunnus" },
                { Header: "Projektipäällikkö", accessor: "projektipaallikko" },
                {
                  Header: "Vastuuorganisaatio",
                  accessor: (projekti) =>
                    projekti.suunnittelustaVastaavaViranomainen &&
                    t(`projekti:vastaava-viranomainen.${projekti.suunnittelustaVastaavaViranomainen}`),
                },
                {
                  Header: "Vaihe",
                  accessor: (projekti) => projekti.vaihe && t(`projekti:projekti-status.${projekti.vaihe}`),
                  minWidth: 100,
                },
                {
                  Header: "Päivitetty",
                  accessor: (projekti) => projekti.paivitetty && formatDate(projekti.paivitetty),
                  minWidth: 100,
                },
                { Header: "oid", accessor: "oid" },
              ],
              manualPagination: true,
              pageCount: Math.ceil(tuloksienMaarat[tyyppi] / PAGE_SIZE),
              useControlledState: (state) =>
                useMemo(
                  () => ({
                    ...state,
                    pageIndex: sivunumero,
                    hiddenColumns: ["oid"],
                  }),
                  [state]
                ),
            }}
            gotoPage={(page) => {
              fetchProjektit({ ...searchInput, sivunumero: page });
            }}
            rowLink={(projekti) => `/yllapito/projekti/${encodeURIComponent(projekti.oid)}`}
            usePagination
            useSortBy
          />
        ) : (
          <p>Ei projekteja.</p>
        )}
      </Section>
      <HassuSpinner open={isLoading} />
    </>
  );
};

// Create a file for this styled component if used elsewhere
const SearchSection = styled(Section)(
  sx({
    backgroundColor: "#F7F7F7",
    borderBottom: "5px solid #0063AF",
    padding: 7,
  })
);

export default VirkamiesHomePage;
