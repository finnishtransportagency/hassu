import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { SchemaOf } from "yup";

import { VelhoHakuTulos } from "@services/api";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import HassuTable from "@components/table/HassuTable";
import useApi from "src/hooks/useApi";
import { ColumnDef, createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

interface SearchInput {
  name: string;
}

const PROJEKTI_NIMI_PARAM = "projektinimi";

const PROJEKTI_NIMI_MAX_LENGTH = 100;
const PROJEKTI_NIMI_MIN_LENGTH = 3;

enum SearchError {
  NO_RESULTS = "NO_RESULTS",
  SEARCH_UNSUCCESSFUL = "SEARCH_UNSUCCESSFUL",
}

const velhoVirheet = {
  NO_RESULTS:
    "Hakuehdoilla ei löytynyt yhtään suunnitelmaa. Tarkista hakuehdot ja varmista, että suunnitelma on tallennettu Projektivelhoon. Ota tarvittaessa yhteys pääkäyttäjään.",
  SEARCH_UNSUCCESSFUL: "Haku epäonnistui. Mikäli ongelma jatkuu, ota yhteys järjestelmän ylläpitäjään.",
};

export default function Perusta() {
  const router = useRouter();
  const [hakuTulos, setHakuTulos] = useState<VelhoHakuTulos[] | null>(null);
  const [searchError, setSearchError] = useState<SearchError | undefined>(undefined);

  const validationSchema: SchemaOf<SearchInput> = Yup.object().shape({
    name: Yup.string().required("Nimi on pakollinen kenttä.").min(PROJEKTI_NIMI_MIN_LENGTH, `Syötä vähintään kolme merkkiä.`),
  });

  const formOptions: UseFormProps<SearchInput> = {
    resolver: yupResolver(validationSchema),
    defaultValues: { name: "" },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SearchInput>(formOptions);

  const api = useApi();

  const { isLoading, withLoadingSpinner } = useLoadingSpinner();

  const onSubmit = useCallback(
    (data: SearchInput) =>
      withLoadingSpinner(
        (async () => {
          if (router.query[PROJEKTI_NIMI_PARAM] !== data.name) {
            await router.replace({ query: { [PROJEKTI_NIMI_PARAM]: data.name } }, undefined, { scroll: false });
            // Route change will trigger onSubmit (this function) another time
            // Return so that requests are not duplicated.
            return;
          }
          try {
            const tulos = await api.getVelhoSuunnitelmasByName(data.name);
            setHakuTulos(tulos);
            if (tulos.length === 0) {
              setSearchError(SearchError.NO_RESULTS);
            } else {
              setSearchError(undefined);
            }
          } catch (e) {
            setSearchError(SearchError.SEARCH_UNSUCCESSFUL);
          }
        })()
      ),
    [api, router, withLoadingSpinner]
  );

  useEffect(() => {
    const FillFormAndSubmit = async (data: SearchInput) => {
      reset(data);
      handleSubmit(onSubmit)();
    };
    if (router.isReady) {
      const name = router.query[PROJEKTI_NIMI_PARAM];
      if (typeof name === "string") {
        FillFormAndSubmit({ name });
      }
    }
  }, [router.isReady, router.query, reset, handleSubmit, onSubmit]);

  return (
    <>
      <h1>Projektin perustaminen</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section>
          <SectionContent>
            <p>
              Hae projekti, jonka haluat tuoda Valtion liikenneväylien suunnittelu -palveluun Projektivelhosta. Hakuehtona voit käyttää
              Projektivelhoon asetetun suunnitelman / projektin nimeä, tai näiden osaa. Jos etsimääsi suunnitelmaa / projektia ei näy
              listassa, varmista, että se on tallennettu Projektivelhoon, ja että hakuehdot ovat oikein. Ota tarvittaessa yhteys
              pääkäyttäjään. Huomioithan, että hakutuloksissa näytetään ainoastaan ne suunnitelmat / projektit joita ei ole vielä perustettu
              palveluun. Käytä etusivun projektihakua etsiäksesi jo perustettuja projekteja.
            </p>
            <TextInput
              error={errors.name}
              className="md:max-w-xs"
              label="Projektin nimi"
              maxLength={PROJEKTI_NIMI_MAX_LENGTH}
              {...register("name")}
            />
          </SectionContent>
          <Button primary style={{ marginRight: "auto" }} endIcon="search" id="hae" disabled={isLoading}>
            Hae
          </Button>
        </Section>
      </form>
      {(hakuTulos || searchError) && (
        <Section noDivider>
          <h2>Hakutulokset</h2>
          {searchError && <Notification type={NotificationType.ERROR}>{velhoVirheet[searchError]}</Notification>}
          {!!hakuTulos?.length && <PerustaTable hakuTulos={hakuTulos} />}
        </Section>
      )}
    </>
  );
}

interface PerustaTableProps {
  hakuTulos: VelhoHakuTulos[];
}

const columnHelper = createColumnHelper<VelhoHakuTulos>();
type OptionalString = string | null | undefined;
type HakuTulosColumnDef = ColumnDef<VelhoHakuTulos, OptionalString>;

const PerustaTable = ({ hakuTulos }: PerustaTableProps) => {
  const { t } = useTranslation("velho-haku");

  const columns = useMemo(() => {
    const cols: HakuTulosColumnDef[] = [
      columnHelper.accessor("asiatunnus", {
        header: "Asiatunnus",
        id: "asiatunnus",
        meta: {
          widthFractions: 2,
          minWidth: 200,
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
            minWidth: 200,
          },
        }
      ),
      columnHelper.accessor("projektiPaallikko", {
        header: "Projektipäällikkö",
        id: "projektiPaallikko",
        meta: {
          widthFractions: 2,
          minWidth: 200,
        },
      }),
    ];
    return cols;
  }, [t]);

  const table = useReactTable({
    data: hakuTulos || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
    enableSorting: false,
    meta: {
      rowHref: (projekti) => {
        return `/yllapito/perusta/${encodeURIComponent(projekti.original.oid)}`;
      },
      customRowStyles: {
        ":hover": {
          "> div > div:nth-of-type(2) > div": {
            textDecoration: "underline 2px #0064af",
            textUnderlineOffset: "4px",
          },
        },
      },
    },
  });

  return <HassuTable table={table} />;
};
