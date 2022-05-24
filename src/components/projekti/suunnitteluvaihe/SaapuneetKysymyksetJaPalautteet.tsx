import { ReactElement, useCallback, useState, useMemo } from "react";
import { Projekti, Palaute, api } from "@services/api";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuTable from "@components/HassuTable";
import CheckBox from "@components/form/CheckBox";
import useSnackbars from "src/hooks/useSnackbars";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import HassuSpinner from "@components/HassuSpinner";
import dayjs from "dayjs";
import { Link } from "@mui/material";
import ButtonLink from "@components/button/ButtonLink";
import { useHassuTable } from "src/hooks/useHassuTable";
interface Props {
  projekti: Projekti;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> | undefined;
}

export default function SaapuneetKysymyksetJaPalautteet({
  projekti,
  reloadProjekti
}: Props): ReactElement {

  const columns = useMemo(() => [
    { Header: "Vastaanotettu", accessor: (palaute: Palaute) => <VastaanottoaikaJaLiite palaute={palaute} />,
      id: "Nimi",
      width: 40
    },
    {
      Header: "Kysymys / palaute",
      accessor: (palaute: Palaute) => <KysymysTaiPalaute oid={projekti.oid} palaute={palaute} />,
      id: "KysymysTaiPalaute",
      minWidth: 100
    },
    {
      Header: "Yhteydenottopyyntö",
      accessor: (palaute: Palaute) => <YhteydenottopyyntoSolu palaute={palaute} />,
      id: "Yhteydenottopyynto",
      width: 45
    },
    {
      Header: "Otettu käsittelyyn",
      accessor: (palaute: Palaute) =>
        <KasittelePalauteCheckbox reloadProjekti={reloadProjekti} oid={projekti.oid} palaute={palaute} />,
      id: "otettuKasittelyyn",
      width: 40
    }
  ], [projekti, reloadProjekti]);

  const palauteTableProps = useHassuTable<Palaute>({
    tableOptions: {
      data: projekti.suunnitteluVaihe?.palautteet || [],
      columns
    }
  });

  return (
    <Section>
      <h5 className="vayla-small-title">Saapuneet kysymykset ja palautteet</h5>
      <SectionContent>
        {(!projekti.suunnitteluVaihe?.palautteet || projekti.suunnitteluVaihe?.palautteet.length === 0) &&
          <p>
            Ei saapuneita kysymyksiä tai palautteita
          </p>
        }
        {(projekti.suunnitteluVaihe?.palautteet && projekti.suunnitteluVaihe?.palautteet.length > 0) &&
          <>
            <HassuTable {...palauteTableProps} />
            <ButtonLink href="">
              Lataa tiedostona
            </ButtonLink>
          </>

        }
      </SectionContent>
    </Section>
  );
};

interface PalauteProps {
  palaute: Palaute
}

function VastaanottoaikaJaLiite({
  palaute
}: PalauteProps) : ReactElement {
  const parsedDate = dayjs(palaute.vastaanotettu);
  return (
    <>
      <div>{parsedDate.format("DD.MM.YYYY HH:mm")}</div>
    </>
  );
}

function KysymysTaiPalaute({
  palaute,
  oid
}: PalauteProps & { oid: string }) : ReactElement {
  return (
    <>
      <div>
        <p style={{ whiteSpace: "pre-line" }}>{palaute.kysymysTaiPalaute}</p>
      </div>
      {palaute.liite &&
        <div>
          <Link href={`yllapito/tiedostot/projekti/${oid}${palaute.liite}`}>Liite</Link>
        </div>
      }
    </>
  )
}

interface KasittelePalauteCheckboxProps {
  palaute: Palaute;
  oid: string;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> | undefined;
}
function KasittelePalauteCheckbox({
  palaute,
  oid,
  reloadProjekti
}: KasittelePalauteCheckboxProps) : ReactElement {
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const merkitseKasittelyynOtetuksi = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.otaPalauteKasittelyyn(oid, palaute.id)
    } catch (e) {
      showErrorMessage("Palautteen merkitseminen käsiteltäväksi epäonnistui.")
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    if (reloadProjekti) reloadProjekti();
    showSuccessMessage("Palaute merkitty käsiteltäväksi.");
  }, [reloadProjekti, palaute, oid, showErrorMessage, showSuccessMessage]);

  return (
    <>
      <CheckBox onChange={merkitseKasittelyynOtetuksi} checked={!!palaute.otettuKasittelyyn} disabled={!!palaute.otettuKasittelyyn} />
      <HassuSpinner open={isSubmitting} />
    </>
  );
}

function YhteydenottopyyntoSolu({
  palaute
}: PalauteProps) : ReactElement {
  return (
    <div>
      <div>{(palaute.yhteydenottotapaEmail || palaute.yhteydenottotapaPuhelin) ? 'Kyllä' : 'Ei'}</div>
      {(palaute.yhteydenottotapaEmail && palaute.sahkoposti) &&
        <div>{palaute.sahkoposti}</div>
      }
      {(palaute.yhteydenottotapaPuhelin && palaute.puhelinnumero) &&
        <div>{palaute.puhelinnumero}</div>
      }
    </div>
  );
}