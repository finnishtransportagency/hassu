import HassuAccordion from "@components/HassuAccordion";
import { AineistoKategoria, AineistoKategoriat, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { useFormContext } from "react-hook-form";
import { AineistoTable } from ".";
import { HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";

interface AineistoAlakategoriaAccordionProps {
  aineistoKategoriat: AineistoKategoriat;
  alakategoriat: AineistoKategoria[];
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
}

export const AineistoAlakategoriaAccordion = (props: AineistoAlakategoriaAccordionProps) => {
  const { watch } = useFormContext<HyvaksymisEsitysForm>();
  const { t } = useTranslation("aineisto");
  const aineistot = watch("muokattavaHyvaksymisEsitys.suunnitelma");
  const aineistotFlat = Object.values(aineistot || {}).flat();
  const aineistojenMaara = props.alakategoriat.reduce((acc, cur) => {
    return acc + getNestedAineistoMaaraForCategory(aineistotFlat, cur);
  }, 0);

  if (!aineistojenMaara) {
    return null;
  }

  return (
    <HassuAccordion
      expandedstate={props.expandedAineistoState}
      items={props.alakategoriat.map((alakategoria) => ({
        title: `${t(`aineisto-kategoria-nimi.${alakategoria.id}`)} (${getNestedAineistoMaaraForCategory(aineistotFlat, alakategoria)})`,
        content: (
          <AineistoAlakategoriaContent
            aineistoKategoriat={props.aineistoKategoriat}
            kategoria={alakategoria}
            expandedAineistoState={props.expandedAineistoState}
          />
        ),
        id: alakategoria.id,
      }))}
    />
  );
};

interface AlakategoriaContentProps {
  aineistoKategoriat: AineistoKategoriat;
  kategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
}

export const AineistoAlakategoriaContent = (props: AlakategoriaContentProps) => {
  const { watch } = useFormContext<HyvaksymisEsitysForm>();
  const aineistot = watch(`muokattavaHyvaksymisEsitys.suunnitelma.${props.kategoria.id}`);
  return (
    <>
      {!!aineistot?.length ? (
        <AineistoTable aineistoKategoriat={props.aineistoKategoriat} kategoriaId={props.kategoria.id} />
      ) : (
        <p>Kategoriaan ei ole asetettu aineistoa.</p>
      )}
      {!!props.kategoria.alaKategoriat?.length && (
        <AineistoAlakategoriaAccordion
          aineistoKategoriat={props.aineistoKategoriat}
          expandedAineistoState={props.expandedAineistoState}
          alakategoriat={props.kategoria.alaKategoriat}
        />
      )}
    </>
  );
};
