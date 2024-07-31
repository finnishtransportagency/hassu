import { Aineisto } from "@services/api";
import { AineistoKategoria } from "common/aineistoKategoriat";
import { useFormContext } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { AineistoNahtavillaTableFormValuesInterface, getAllOptionsForKategoriat } from "../util";
import { AineistoAlakategoriaAccordion, AineistoTable } from ".";
import { useMemo } from "react";
import useTranslation from "next-translate/useTranslation";

const kategoriaInfoText: Record<string, string> = {
  osa_a: "Selostusosan alle tuodaan A- tai T100 -kansioiden aineistot.",
  osa_b: "Pääpiirustusten alle tuodaan B- tai T200 -kansioiden aineistot.",
  osa_c: "Informatiivisen aineiston alle tuodaan C- tai T300 -kansioiden aineistot.",
  kategorisoimattomat:
    "Kategorisoimattomat alle tuodaan kaikki aineistot, joita ei pystytty automaattisesti kategorisoimaan. Aineistot tulee siirtää Selostusosan-, Pääpiirustukset- tai Informatiivinen aineisto -kategorioiden alle. Pääset siirtymään kuulutukselle vasta, kun aineistot on siirretty ja Kategorisoimattomat on tyhjä.",
};

interface SuunnitelmaAineistoPaakategoriaContentProps {
  paakategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  aineisto: Aineisto[] | undefined | null;
  kaikkiKategoriat: AineistoKategoria[];
}

export function SuunnitelmaAineistoPaakategoriaContent(props: Readonly<SuunnitelmaAineistoPaakategoriaContentProps>) {
  const { data: projekti } = useProjekti();
  const { watch: aineistoWatch } = useFormContext<AineistoNahtavillaTableFormValuesInterface>();

  const aineisto = aineistoWatch("aineistoNahtavilla");

  const { t } = useTranslation("aineisto");

  const allOptions = useMemo(() => getAllOptionsForKategoriat({ kategoriat: props.kaikkiKategoriat, t }), [props.kaikkiKategoriat, t]);

  return (
    <>
      <p>{kategoriaInfoText[props.paakategoria.id]}</p>
      {!!projekti?.oid && !!aineisto?.[props.paakategoria.id]?.length && (
        <AineistoTable aineisto={props.aineisto} kategoriaId={props.paakategoria.id} allOptions={allOptions} />
      )}
      {props.paakategoria.alaKategoriat && (
        <AineistoAlakategoriaAccordion
          aineisto={props.aineisto}
          alakategoriat={props.paakategoria.alaKategoriat}
          expandedAineistoState={props.expandedAineistoState}
          allOptions={allOptions}
        />
      )}
    </>
  );
}
