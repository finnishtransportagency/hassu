import { api, ProjektiHakutulos, ProjektiTyyppi } from "@services/api";
import React, { useEffect, useState } from "react";
import Tabs from "@components/layout/tabs/Tabs";
import { useRouter } from "next/router";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import Table from "@components/Table";
import HassuSpinner from "@components/HassuSpinner";

const PROJEKTI_TYYPPI_PARAM = "tyyppi";

const VirkamiesHomePage = () => {
  const [tyyppi, setTyyppi] = useState<ProjektiTyyppi>(ProjektiTyyppi.TIE);
  const [hakutulos, setHakutulos] = useState<ProjektiHakutulos>();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchProjektit(projektiTyyppi?: ProjektiTyyppi) {
      setIsLoading(true);
      try {
        const result = await api.listProjektit({ projektiTyyppi: projektiTyyppi });
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
    if (router.isReady) {
      const tyyppiParam = router.query[PROJEKTI_TYYPPI_PARAM];
      if (typeof tyyppiParam === "string" && Object.keys(ProjektiTyyppi).includes(tyyppiParam)) {
        setTyyppi(tyyppiParam as ProjektiTyyppi);
        fetchProjektit(tyyppiParam as ProjektiTyyppi);
      } else {
        fetchProjektit();
      }
    }
  }, [router]);

  return (
    <section>
      <h2 className="vayla-title">Projektit</h2>
      <Tabs
        value={tyyppi}
        onChange={(_, value) => {
          router.replace({ query: { [PROJEKTI_TYYPPI_PARAM]: value } });
        }}
        tabs={[
          {
            label: "Tiesuunnitelmat" + (hakutulos?.tiesuunnitelmatMaara ? ` (${hakutulos?.tiesuunnitelmatMaara})` : ""),
            content: <HomePageTable isLoading={isLoading} hakutulos={hakutulos} />,
            value: ProjektiTyyppi.TIE,
          },
          {
            label:
              "Ratasuunnitelmat" + (hakutulos?.tiesuunnitelmatMaara ? ` (${hakutulos?.ratasuunnitelmatMaara})` : ""),
            content: <HomePageTable isLoading={isLoading} hakutulos={hakutulos} />,
            value: ProjektiTyyppi.RATA,
          },
          {
            label:
              "Yleissuunnitelmat" + (hakutulos?.tiesuunnitelmatMaara ? ` (${hakutulos?.yleissuunnitelmatMaara})` : ""),
            content: <HomePageTable isLoading={isLoading} hakutulos={hakutulos} />,
            value: ProjektiTyyppi.YLEINEN,
          },
        ]}
      />
      <HassuSpinner open={isLoading}/>
    </section>
  );
};

interface TableProps {
  hakutulos?: ProjektiHakutulos;
  isLoading: boolean;
}

const HomePageTable = ({ hakutulos, isLoading }: TableProps) => {
  const { t } = useTranslation();
  return (
    <Table
      cols={[
        { header: "Nimi", data: (projekti) => projekti.nimi, fraction: 4 },
        { header: "Asiatunnus", data: (projekti) => projekti.asiatunnus, fraction: 2 },
        { header: "Projektipäällikko", data: (_) => "-", fraction: 2 },
        {
          header: "Vastuuorganisaatio",
          data: (projekti) => projekti.suunnittelustaVastaavaViranomainen,
          fraction: 2,
        },
        { header: "Vaihe", data: (projekti) => t(`projekti:projekti-status.${projekti.vaihe}`), fraction: 1 },
        { header: "Päivitetty", data: (_) => "-", fraction: 1 },
      ]}
      rows={hakutulos?.tulokset || []}
      isLoading={isLoading}
      rowLink={(projekti) => `/yllapito/projekti/${encodeURIComponent(projekti.oid)}`}
    />
  );
};

export default VirkamiesHomePage;
