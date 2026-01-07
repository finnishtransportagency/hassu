import HassuAccordion from "@components/HassuAccordion";
import { AineistoKategoria, AineistoKategoriat, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { useFormContext } from "react-hook-form";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
import { AineistoLinkitettyProjektiTable } from "./AineistoLinkitettyProjektiTable";

interface AineistoAlakategoriaAccordionProps {
  aineistoKategoriat: AineistoKategoriat;
  alakategoriat: AineistoKategoria[];
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  ennakkoneuvottelu?: boolean;
}

export const AineistoLinkitettyProjektiAlakategoria = (props: AineistoAlakategoriaAccordionProps) => {
  const { watch } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { t } = useTranslation("aineisto");
  const aineistot = watch(
    props.ennakkoneuvottelu ? "ennakkoNeuvottelu.linkitetynProjektinAineisto" : "muokattavaHyvaksymisEsitys.linkitetynProjektinAineisto"
  );
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
            ennakkoneuvottelu={props.ennakkoneuvottelu}
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
  ennakkoneuvottelu?: boolean;
}

export const AineistoAlakategoriaContent = (props: AlakategoriaContentProps) => {
  const { watch } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const aineistot = watch(
    `${props.ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.linkitetynProjektinAineisto.${props.kategoria.id}`
  );
  return (
    <>
      {!!aineistot?.length ? (
        <AineistoLinkitettyProjektiTable
          aineistoKategoriat={props.aineistoKategoriat}
          kategoriaId={props.kategoria.id}
          ennakkoneuvottelu={props.ennakkoneuvottelu}
        />
      ) : (
        <p>Kategoriaan ei ole asetettu aineistoa.</p>
      )}
      {!!props.kategoria.alaKategoriat?.length && (
        <AineistoLinkitettyProjektiAlakategoria
          aineistoKategoriat={props.aineistoKategoriat}
          expandedAineistoState={props.expandedAineistoState}
          alakategoriat={props.kategoria.alaKategoriat}
          ennakkoneuvottelu={props.ennakkoneuvottelu}
        />
      )}
    </>
  );
};
