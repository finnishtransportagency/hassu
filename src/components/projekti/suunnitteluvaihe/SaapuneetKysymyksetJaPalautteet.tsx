import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Palaute, Projekti } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuTable from "@components/HassuTable";
import CheckBox from "@components/form/CheckBox";
import useSnackbars from "src/hooks/useSnackbars";
import HassuSpinner from "@components/HassuSpinner";
import dayjs from "dayjs";
import { Link } from "@mui/material";
import { useHassuTable } from "src/hooks/useHassuTable";
import useApi from "src/hooks/useApi";
import Button from "@components/button/Button";

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

  const columns = useMemo(
    () => [
      {
        Header: "Vastaanotettu",
        accessor: (palaute: Palaute) => <VastaanottoaikaJaLiite palaute={palaute} />,
        id: "Nimi",
        width: 40,
      },
      {
        Header: "Kysymys / palaute",
        accessor: (palaute: Palaute) => <KysymysTaiPalaute oid={projekti.oid} palaute={palaute} />,
        id: "KysymysTaiPalaute",
        minWidth: 100,
      },
      {
        Header: "Yhteydenottopyyntö",
        accessor: (palaute: Palaute) => <YhteydenottopyyntoSolu palaute={palaute} />,
        id: "Yhteydenottopyynto",
        width: 45,
      },
      {
        Header: "Otettu käsittelyyn",
        accessor: (palaute: Palaute) => (
          <KasittelePalauteCheckbox paivitaPalautteet={paivitaPalautteet} oid={projekti.oid} palaute={palaute} />
        ),
        id: "otettuKasittelyyn",
        width: 40,
      },
    ],
    [paivitaPalautteet, projekti.oid]
  );

  const palauteTableProps = useHassuTable<Palaute>({
    tableOptions: {
      data: palautteet || [],
      columns,
    },
  });

  return (
    <Section>
      <h5 className="vayla-small-title">Saapuneet kysymykset ja palautteet</h5>
      <SectionContent>
        {(!palautteet || palautteet.length === 0) && <p>Ei saapuneita kysymyksiä tai palautteita</p>}
        {palautteet && palautteet.length > 0 && (
          <>
            <HassuTable {...palauteTableProps} />
            <Button disabled>Lataa tiedostona</Button>
          </>
        )}
      </SectionContent>
    </Section>
  );
}

interface PalauteProps {
  palaute: Palaute;
}

function VastaanottoaikaJaLiite({ palaute }: PalauteProps): ReactElement {
  const parsedDate = dayjs(palaute.vastaanotettu);
  return (
    <>
      <div>{parsedDate.format("DD.MM.YYYY HH:mm")}</div>
    </>
  );
}

function KysymysTaiPalaute({ palaute, oid }: PalauteProps & { oid: string }): ReactElement {
  return (
    <>
      <div>
        <p style={{ whiteSpace: "pre-line" }}>{palaute.kysymysTaiPalaute}</p>
      </div>
      {palaute.liite && (
        <div>
          <Link href={`/yllapito/tiedostot/projekti/${oid}${palaute.liite}`}>Liite</Link>
        </div>
      )}
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

  const merkitseKasittelyynOtetuksi = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.otaPalauteKasittelyyn(oid, palaute.id);
    } catch (e) {
      showErrorMessage("Palautteen merkitseminen käsiteltäväksi epäonnistui.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    if (paivitaPalautteet) paivitaPalautteet();
    showSuccessMessage("Palaute merkitty käsiteltäväksi.");
  }, [paivitaPalautteet, showSuccessMessage, api, oid, palaute.id, showErrorMessage]);

  return (
    <>
      <CheckBox onChange={merkitseKasittelyynOtetuksi} checked={!!palaute.otettuKasittelyyn} disabled={!!palaute.otettuKasittelyyn} />
      <HassuSpinner open={isSubmitting} />
    </>
  );
}

function YhteydenottopyyntoSolu({ palaute }: PalauteProps): ReactElement {
  return (
    <div>
      <div>{palaute.yhteydenottotapaEmail || palaute.yhteydenottotapaPuhelin ? "Kyllä" : "Ei"}</div>
      {palaute.yhteydenottotapaEmail && palaute.sahkoposti && <div>{palaute.sahkoposti}</div>}
      {palaute.yhteydenottotapaPuhelin && palaute.puhelinnumero && <div>{palaute.puhelinnumero}</div>}
    </div>
  );
}
