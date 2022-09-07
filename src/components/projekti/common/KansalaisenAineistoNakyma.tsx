import React, { Key, ReactElement, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "src/util/dateUtils";
import SectionContent from "@components/layout/SectionContent";
import { Aineisto, ProjektiJulkinen, NahtavillaoloVaiheJulkaisuJulkinen, HyvaksymisPaatosVaiheJulkaisuJulkinen } from "@services/api";
import Trans from "next-translate/Trans";
import HassuAccordion from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat } from "common/aineistoKategoriat";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonFlat from "@components/button/ButtonFlat";

type Props = {
  projekti: ProjektiJulkinen;
  kuulutus: NahtavillaoloVaiheJulkaisuJulkinen | HyvaksymisPaatosVaiheJulkaisuJulkinen;
  naytaAineistoPaivanaKuulutuksenJulkaisuPaiva?: boolean;
};

export default function KansalaisenAineistoNakyma({
  projekti,
  kuulutus,
  naytaAineistoPaivanaKuulutuksenJulkaisuPaiva,
}: Props): ReactElement {
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
      <h4 className="vayla-small-title">{t(`ui-otsikot.nahtavillaolo.nahtavilla_oleva_aineisto`)}</h4>
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
            <FontAwesomeIcon icon="chevron-down" transform={`down-6`} flip={areAineistoKategoriesExpanded ? "vertical" : undefined} />
            <FontAwesomeIcon icon="chevron-up" transform={`up-6`} flip={areAineistoKategoriesExpanded ? "vertical" : undefined} />
          </span>
        }
      >
        {areAineistoKategoriesExpanded ? "Sulje" : "Avaa"} kaikki kategoriat
      </ButtonFlat>
      <AineistoKategoriaAccordion
        aineistoKategoriat={aineistoKategoriat.listKategoriat()}
        aineistot={kuulutus.aineistoNahtavilla}
        expandedState={[expandedAineistoKategoriat, setExpandedAineistoKategoriat]}
        paakategoria={true}
        julkaisuPaiva={naytaAineistoPaivanaKuulutuksenJulkaisuPaiva ? kuulutus.kuulutusPaiva || undefined : undefined}
      />
    </SectionContent>
  );
}

interface AineistoKategoriaAccordionProps {
  aineistoKategoriat?: AineistoKategoria[];
  aineistot?: Aineisto[] | null;
  expandedState: [React.Key[], React.Dispatch<React.Key[]>];
  paakategoria?: boolean;
  julkaisuPaiva?: string | undefined;
}

const AineistoKategoriaAccordion = (props: AineistoKategoriaAccordionProps) => {
  const { t } = useTranslation("aineisto");

  return props.aineistoKategoriat ? (
    <HassuAccordion
      items={props.aineistoKategoriat
        ?.filter((kategoria) => {
          if (props.paakategoria) {
            return true;
          }
          const aineistot = props.aineistot?.filter(
            (aineisto) =>
              kategoria.id === aineisto.kategoriaId ||
              kategoria.alaKategoriat?.some((alakategoria) => alakategoria.id === aineisto.kategoriaId)
          );
          return !!aineistot?.length;
        })
        .map((kategoria) => {
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
                julkaisuPaiva={props.julkaisuPaiva}
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
  julkaisuPaiva?: string | undefined;
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
                <ExtLink href={aineisto.tiedosto!} target="_blank" rel="noreferrer">
                  {aineisto.nimi}{" "}
                  <span className="ml-2 text-black">
                    ({aineisto.nimi.split(".").pop()})
                    {props.julkaisuPaiva ? formatDate(props.julkaisuPaiva) : aineisto.tuotu && formatDate(aineisto.tuotu)}
                  </span>
                </ExtLink>
              </Stack>
            ))}
        </Stack>
      ) : (
        <p>Kategoriassa ei ole aineistoa</p>
      )}
      {!!props.aineistot?.length && (
        <AineistoKategoriaAccordion
          aineistoKategoriat={props.kategoria.alaKategoriat}
          aineistot={props.aineistot}
          expandedState={props.expandedState}
        />
      )}
    </>
  );
};
