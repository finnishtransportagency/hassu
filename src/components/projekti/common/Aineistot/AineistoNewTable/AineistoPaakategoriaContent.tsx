import { AineistoKategoria, AineistoKategoriat } from "common/aineistoKategoriat";
import { useFormContext } from "react-hook-form";
import { AineistoAlakategoriaAccordion, AineistoTable } from ".";
import { HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";

const kategoriaInfoText: Record<string, string> = {
  osa_a: "Selostusosan alle tuodaan A- tai T100 -kansioiden aineistot.",
  osa_b: "Pääpiirustusten alle tuodaan B- tai T200 -kansioiden aineistot.",
  osa_c: "Informatiivisen aineiston alle tuodaan C- tai T300 -kansioiden aineistot.",
  kategorisoimattomat:
    "Kategorisoimattomat alle tuodaan kaikki aineistot, joita ei pystytty automaattisesti kategorisoimaan. Aineistot tulee siirtää Selostusosan-, Pääpiirustukset- tai Informatiivinen aineisto -kategorioiden alle.",
};

interface SuunnitelmaAineistoPaakategoriaContentProps {
  aineistoKategoriat: AineistoKategoriat;
  paakategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
}

export function SuunnitelmaAineistoPaakategoriaContent(props: SuunnitelmaAineistoPaakategoriaContentProps) {
  const { watch } = useFormContext<HyvaksymisEsitysForm>();

  const paaKategoriaAineisto = watch(`muokattavaHyvaksymisEsitys.suunnitelma.${props.paakategoria.id}`);

  return (
    <>
      <p>{kategoriaInfoText[props.paakategoria.id]}</p>
      {!!paaKategoriaAineisto?.length && (
        <AineistoTable aineistoKategoriat={props.aineistoKategoriat} kategoriaId={props.paakategoria.id} />
      )}
      {props.paakategoria.alaKategoriat && (
        <AineistoAlakategoriaAccordion
          aineistoKategoriat={props.aineistoKategoriat}
          alakategoriat={props.paakategoria.alaKategoriat}
          expandedAineistoState={props.expandedAineistoState}
        />
      )}
    </>
  );
}
