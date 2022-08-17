import React, { Key, ReactElement, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "src/util/dateUtils";
import SectionContent from "@components/layout/SectionContent";
import {
  Aineisto,
  ProjektiJulkinen,
  NahtavillaoloVaiheJulkaisuJulkinen,
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
} from "@services/api";
import Trans from "next-translate/Trans";
import HassuAccordion from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat } from "common/aineistoKategoriat";
import { Link, Stack } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonFlat from "@components/button/ButtonFlat";

type Props = {
  projekti: ProjektiJulkinen;
  kuulutus: NahtavillaoloVaiheJulkaisuJulkinen | HyvaksymisPaatosVaiheJulkaisuJulkinen;
};

export default function KansalaisenAineistoNakyma({ projekti, kuulutus }: Props): ReactElement {
  const { t } = useTranslation("projekti");

  const [expandedAineistoKategoriat, setExpandedAineistoKategoriat] = useState<Key[]>([]);
  const areAineistoKategoriesExpanded = !!expandedAineistoKategoriat.length;

  const velho = projekti?.velho;

  if (!projekti || !kuulutus || !velho) {
    return <div />;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + velho.maakunnat.join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + velho.kunnat.join(", ");
  }

  const getAlaKategoryIds = (aineistoKategoriat: AineistoKategoria[]) => {
    const keys: Key[] = [];
    aineistoKategoriat.forEach((kategoria) => {
      keys.push(kategoria.id);
      if (kategoria.alaKategoriat) {
        keys.push(...getAlaKategoryIds(kategoria.alaKategoriat));
      }
    });
    return keys;
  };

  return (
    <SectionContent>
      <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.esittelyaineisto_ja_suunnitelmat`)}</h4>
      <Trans
        i18nKey="projekti:info.nahtavillaolo.ei-rata.suunnitelmiin_on_mahdollista"
        values={{
          kuulutusVaihePaattyyPaiva: formatDate(kuulutus.kuulutusVaihePaattyyPaiva),
        }}
        components={{ p: <p />, b: <b /> }}
      />
      <ButtonFlat
        type="button"
        onClick={() => {
          if (areAineistoKategoriesExpanded) {
            setExpandedAineistoKategoriat([]);
          } else {
            setExpandedAineistoKategoriat(getAlaKategoryIds(aineistoKategoriat.listKategoriat()));
          }
        }}
        iconComponent={
          <span className="fa-layers">
            <FontAwesomeIcon
              icon="chevron-down"
              transform={`down-6`}
              flip={areAineistoKategoriesExpanded ? "vertical" : undefined}
            />
            <FontAwesomeIcon
              icon="chevron-up"
              transform={`up-6`}
              flip={areAineistoKategoriesExpanded ? "vertical" : undefined}
            />
          </span>
        }
      >
        {areAineistoKategoriesExpanded ? "Sulje" : "Avaa"} kaikki kategoriat
      </ButtonFlat>
      <AineistoKategoriaAccordion
        aineistoKategoriat={aineistoKategoriat.listKategoriat()}
        aineistot={kuulutus.aineistoNahtavilla}
        expandedState={[expandedAineistoKategoriat, setExpandedAineistoKategoriat]}
      />
    </SectionContent>
  );
}

interface AineistoKategoriaAccordionProps {
  aineistoKategoriat?: AineistoKategoria[];
  aineistot?: Aineisto[] | null;
  expandedState: [React.Key[], React.Dispatch<React.Key[]>];
}

const AineistoKategoriaAccordion = (props: AineistoKategoriaAccordionProps) => {
  const { t } = useTranslation("aineisto");
  return props.aineistoKategoriat ? (
    <HassuAccordion
      items={props.aineistoKategoriat?.map((kategoria) => {
        const aineistot = props.aineistot?.filter(
          (aineisto) =>
            kategoria.id === aineisto.kategoriaId ||
            kategoria.alaKategoriat?.some((alakategoria) => alakategoria.id === aineisto.kategoriaId)
        );
        return {
          title: `${t(`aineisto-kategoria-nimi.${kategoria.id}`)} (${aineistot?.length || 0})`,
          content: (
            <SuunnitelmaAineistoKategoriaContent
              aineistot={aineistot}
              kategoria={kategoria}
              expandedState={props.expandedState}
            />
          ),
          id: kategoria.id,
        };
      })}
      expandedState={props.expandedState}
    />
  ) : null;
};

interface SuunnitelmaAineistoKategoriaContentProps {
  aineistot?: Aineisto[];
  kategoria: AineistoKategoria;
  expandedState: [React.Key[], React.Dispatch<React.Key[]>];
}

const SuunnitelmaAineistoKategoriaContent = (props: SuunnitelmaAineistoKategoriaContentProps) => {
  return (
    <>
      {!!props.aineistot?.length ? (
        <Stack direction="column" rowGap={1.5}>
          {props.aineistot
            ?.filter((aineisto) => typeof aineisto.tiedosto === "string" && aineisto.kategoriaId === props.kategoria.id)
            .map((aineisto) => (
              <Stack direction="row" alignItems="flex-end" columnGap={2} key={aineisto.dokumenttiOid}>
                <Link href={aineisto.tiedosto!} target="_blank" rel="noreferrer">
                  {aineisto.nimi}
                </Link>
                <span>({"pdf" || aineisto.nimi.split(".").pop()})</span>
                <a href={aineisto.tiedosto!} target="_blank" rel="noreferrer">
                  <FontAwesomeIcon icon="external-link-alt" size="lg" className="text-primary-dark" />
                </a>
              </Stack>
            ))}
        </Stack>
      ) : (
        <p>Kategoriassa ei ole aineistoa</p>
      )}
      <AineistoKategoriaAccordion
        aineistoKategoriat={props.kategoria.alaKategoriat}
        aineistot={props.aineistot}
        expandedState={props.expandedState}
      />
    </>
  );
};
