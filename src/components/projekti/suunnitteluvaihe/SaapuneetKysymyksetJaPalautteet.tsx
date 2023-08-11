import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { LiitteenSkannausTulos, Palaute, Projekti } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuTable from "@components/table/HassuTable";
import CheckBox from "@components/form/CheckBox";
import useSnackbars from "src/hooks/useSnackbars";
import HassuSpinner from "@components/HassuSpinner";
import dayjs from "dayjs";
import ExtLink from "@components/ExtLink";
import useApi from "src/hooks/useApi";
import ButtonLink from "@components/button/ButtonLink";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";

interface Props {
  projekti: Projekti;
}

export default function SaapuneetKysymyksetJaPalautteet({ projekti }: Props): ReactElement {
  const [palautteet, setPalautteet] = useState<Palaute[]>();

  const api = useApi();

  const paivitaPalautteet = useCallback(async () => {
    const palauteLista = await api.listaaPalautteet(projekti.oid);
    setPalautteet(palauteLista);
  }, [api, projekti.oid]);

  useEffect(() => {
    paivitaPalautteet();
  }, [paivitaPalautteet]);

  const columns = useMemo<ColumnDef<Palaute>[]>(
    () => [
      {
        header: "Vastaanotettu",
        accessorFn: (palaute: Palaute) => <VastaanottoaikaJaLiite oid={projekti.oid} palaute={palaute} />,
        id: "vastaanotettu",
      },
      {
        header: "Kysymys / palaute",
        accessorFn: (palaute: Palaute) => <KysymysTaiPalaute palaute={palaute} />,
        id: "kysymysTaiPalaute",
      },
      {
        header: "Yhteydenottopyyntö",
        accessorFn: (palaute: Palaute) => <YhteydenottopyyntoSolu palaute={palaute} />,
        id: "yhteydenottopyynto",
      },
      {
        header: "Vastattu",
        accessorFn: (palaute: Palaute) => (
          <KasittelePalauteCheckbox paivitaPalautteet={paivitaPalautteet} oid={projekti.oid} palaute={palaute} />
        ),
        id: "vastattu",
      },
    ],
    [paivitaPalautteet, projekti.oid]
  );

  const palauteTable = useReactTable<Palaute>({
    data: palautteet || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
  });

  return (
    <Section>
      <h5 className="vayla-small-title">Saapuneet kysymykset ja palautteet</h5>
      {!palautteet?.length ? (
        <p>Ei saapuneita kysymyksiä tai palautteita</p>
      ) : (
        <>
          <p>
            Saapuneista kysymyksistä ja palautteista on lähetetty sähköpostitse tiedote henkilöille, jotka on valittu tiedotteiden
            vastaanottajiksi ‘Projektin henkilöt’-sivulla.
          </p>
          <SectionContent>
            <HassuTable table={palauteTable} />
            <ButtonLink href={"/api/projekti/" + projekti.oid + "/palautteet"} useNextLink={false} target={"_blank"}>
              Lataa pdf-tiedostona
            </ButtonLink>
          </SectionContent>
        </>
      )}
    </Section>
  );
}

interface PalauteProps {
  palaute: Palaute;
}

function VastaanottoaikaJaLiite({ palaute, oid }: PalauteProps & { oid: string }): ReactElement {
  const parsedDate = dayjs(palaute.vastaanotettu);
  return (
    <>
      <div>{parsedDate.format("DD.MM.YYYY HH:mm")}</div>
      {palaute.liite && palaute.liitteenSkannausTulos !== LiitteenSkannausTulos.SAASTUNUT && (
        <div>
          <ExtLink hideIcon href={`/yllapito/tiedostot/projekti/${oid}${palaute.liite}`}>
            <img src="/paperclip.svg" alt="Liite" />
          </ExtLink>
        </div>
      )}
      {palaute.liite && palaute.liitteenSkannausTulos == LiitteenSkannausTulos.SAASTUNUT && <div>Liiteestä löytyi virus</div>}
    </>
  );
}

function KysymysTaiPalaute({ palaute }: PalauteProps): ReactElement {
  return (
    <>
      <div>
        <p style={{ whiteSpace: "pre-line" }}>{palaute.kysymysTaiPalaute}</p>
      </div>
    </>
  );
}

interface KasittelePalauteCheckboxProps {
  palaute: Palaute;
  oid: string;
  paivitaPalautteet: () => Promise<void>;
}

function KasittelePalauteCheckbox({ palaute, oid, paivitaPalautteet }: KasittelePalauteCheckboxProps): ReactElement {
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const api = useApi();

  const merkitseVastatuksi = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.asetaPalauteVastattu(oid, palaute.id, true);
    } catch (e) {
      showErrorMessage("Palautteen merkitseminen vastatuksi epäonnistui.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    if (paivitaPalautteet) {
      paivitaPalautteet();
    }
    showSuccessMessage("Palaute merkitty vastatuksi.");
  }, [paivitaPalautteet, showSuccessMessage, api, oid, palaute.id, showErrorMessage]);

  const merkitseEiVastatuksi = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.asetaPalauteVastattu(oid, palaute.id, false);
    } catch (e) {
      showErrorMessage("Palautteen merkitseminen ei-vastatuksi epäonnistui.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    if (paivitaPalautteet) {
      paivitaPalautteet();
    }
    showSuccessMessage("Palaute merkitty ei-vastatuksi.");
  }, [paivitaPalautteet, showSuccessMessage, api, oid, palaute.id, showErrorMessage]);

  const merkitsePalaute = useCallback(
    async (vastattu: boolean) => {
      if (vastattu) {
        merkitseVastatuksi();
        palaute.vastattu = true;
      } else {
        merkitseEiVastatuksi();
        palaute.vastattu = false;
      }
    },
    [merkitseEiVastatuksi, merkitseVastatuksi, palaute]
  );

  return (
    <>
      <CheckBox onChange={(event) => merkitsePalaute(event.target.checked)} checked={!!palaute.vastattu} />
      <HassuSpinner open={isSubmitting} />
    </>
  );
}

function YhteydenottopyyntoSolu({ palaute }: PalauteProps): ReactElement {
  return (
    <div>
      {!palaute.yhteydenottotapaPuhelin && !palaute.yhteydenottotapaEmail && <div>Ei</div>}
      {palaute.yhteydenottotapaPuhelin && <div>Kyllä, puhelimitse</div>}
      {palaute.yhteydenottotapaPuhelin && palaute.puhelinnumero && <div>{palaute.puhelinnumero}</div>}
      {palaute.yhteydenottotapaEmail && <div>Kyllä, sähköpostitse</div>}
      {palaute.yhteydenottotapaEmail && palaute.sahkoposti && <div>{palaute.sahkoposti}</div>}
    </div>
  );
}
