import { api, ListaaProjektitInput, ProjektiHakutulos, ProjektiTyyppi, Status, Viranomainen } from "@services/api";
import React, { useEffect, useState } from "react";
import Tabs from "@components/layout/tabs/Tabs";
import { useRouter } from "next/router";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import Table from "@components/Table";
import HassuSpinner from "@components/HassuSpinner";

import { styled, experimental_sx as sx } from "@mui/material";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import CheckBox from "@components/form/CheckBox";
import Button from "@components/button/Button";
import FormGroup from "@components/form/FormGroup";
import Select from "@components/form/Select";
import { useForm } from "react-hook-form";
import { ParsedUrlQuery } from "querystring";
import { omitBy } from "lodash";
import { formatDate } from "src/util/dateUtils";

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
  if (query?.vaylamuoto && typeof query?.vaylamuoto === "string") {
    result.vaylamuoto = [query?.vaylamuoto];
  }
  if (
    typeof query?.suunnittelustaVastaavaViranomainen === "string" &&
    Object.keys(Viranomainen).includes(query?.suunnittelustaVastaavaViranomainen)
  ) {
    result.suunnittelustaVastaavaViranomainen = [query?.suunnittelustaVastaavaViranomainen as Viranomainen];
  }
  if (typeof query?.vaihe === "string" && Object.keys(Status).includes(query?.vaihe)) {
    result.vaihe = [query?.vaihe as Status];
  }
  if (query?.vainProjektitMuokkausOikeuksin === "true") {
    result.vainProjektitMuokkausOikeuksin = true;
  }

  return result;
};

const VirkamiesHomePage = () => {
  const [tyyppi, setTyyppi] = useState<ProjektiTyyppi>(ProjektiTyyppi.TIE);
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulos>();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation("projekti");
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (router.isReady) {
      async function fetchProjektit(input: ListaaProjektitInput) {
        setIsLoading(true);
        try {
          const result = await api.listProjektit(input);
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
      }
      const input = mapQueryToListaaProjektiInput(router.query);
      setTyyppi(input.projektiTyyppi || ProjektiTyyppi.TIE);
      fetchProjektit(input);
      reset(input);
    }
  }, [router, reset]);

  const onSubmit = (data: any) => {
    const searchData = omitBy(data, (value) => !value || (Array.isArray(value) && value.length === 0));
    router.replace({ query: searchData }, undefined, { scroll: false });
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
            <Select
              label="Väylämuoto"
              options={["tie", "rata"].map((muoto) => ({ label: t(`projekti-vayla-muoto.${muoto}`), value: muoto }))}
              addEmptyOption
              {...register("vaylamuoto")}
            />
            <Select
              label="Suunnittelusta vastaava viranomainen"
              options={Object.values(Viranomainen).map((viranomainen) => ({
                value: viranomainen,
                label: t(`vastaava-viranomainen.${viranomainen}`),
              }))}
              addEmptyOption
              {...register("suunnittelustaVastaavaViranomainen")}
            />
            <Select
              label="Vaihe"
              options={Object.values(Status).map((status) => ({
                value: status,
                label: t(`projekti-status.${status}`),
              }))}
              addEmptyOption
              {...register("vaihe")}
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
            router.replace({ query: { ...router.query, projektiTyyppi: value } }, undefined, {
              scroll: false,
            });
          }}
          tabs={[
            {
              label:
                "Tiesuunnitelmat" +
                (hakutulos?.hasOwnProperty("tiesuunnitelmatMaara") ? ` (${hakutulos?.tiesuunnitelmatMaara || 0})` : ""),
              content: <HomePageTable isLoading={isLoading} hakutulos={hakutulos} />,
              value: ProjektiTyyppi.TIE,
            },
            {
              label:
                "Ratasuunnitelmat" +
                (hakutulos?.hasOwnProperty("ratasuunnitelmatMaara")
                  ? ` (${hakutulos?.ratasuunnitelmatMaara || 0})`
                  : ""),
              content: <HomePageTable isLoading={isLoading} hakutulos={hakutulos} />,
              value: ProjektiTyyppi.RATA,
            },
            {
              label:
                "Yleissuunnitelmat" +
                (hakutulos?.hasOwnProperty("yleissuunnitelmatMaara")
                  ? ` (${hakutulos?.yleissuunnitelmatMaara || 0})`
                  : ""),
              content: <HomePageTable isLoading={isLoading} hakutulos={hakutulos} />,
              value: ProjektiTyyppi.YLEINEN,
            },
          ]}
        />
        <HassuSpinner open={isLoading} />
      </Section>
    </>
  );
};

interface TableProps {
  hakutulos?: ProjektiHakutulos;
  isLoading: boolean;
}

const HomePageTable = ({ hakutulos, isLoading }: TableProps) => {
  const { t } = useTranslation();
  return (
    <>
      {hakutulos?.tulokset?.length && hakutulos?.tulokset?.length > 0 ? (
        <Table
          cols={[
            { header: "Nimi", data: (projekti) => projekti.nimi, fraction: 4 },
            { header: "Asiatunnus", data: (projekti) => projekti.asiatunnus, fraction: 2 },
            { header: "Projektipäällikkö", data: (projekti) => projekti.projektipaallikko, fraction: 2 },
            {
              header: "Vastuuorganisaatio",
              data: (projekti) =>
                projekti.suunnittelustaVastaavaViranomainen &&
                t(`projekti:vastaava-viranomainen.${projekti.suunnittelustaVastaavaViranomainen}`),
              fraction: 2,
            },
            {
              header: "Vaihe",
              data: (projekti) => projekti.vaihe && t(`projekti:projekti-status.${projekti.vaihe}`),
              fraction: 1,
            },
            {
              header: "Päivitetty",
              data: (projekti) => projekti.paivitetty && formatDate(projekti.paivitetty),
              fraction: 1,
            },
          ]}
          rows={hakutulos?.tulokset || []}
          isLoading={isLoading}
          rowLink={(projekti) => `/yllapito/projekti/${encodeURIComponent(projekti.oid)}`}
        />
      ) : (
        <p>Ei projekteja.</p>
      )}
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
