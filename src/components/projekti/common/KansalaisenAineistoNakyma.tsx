import React, { Key, ReactElement, useMemo, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "common/util/dateUtils";
import SectionContent from "@components/layout/SectionContent";
import {
  Aineisto,
  ProjektiJulkinen,
  NahtavillaoloVaiheJulkaisuJulkinen,
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
  UudelleenKuulutus,
} from "@services/api";
import Trans from "next-translate/Trans";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat } from "common/aineistoKategoriat";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ButtonFlat from "@components/button/ButtonFlat";
import { kuntametadata } from "../../../../common/kuntametadata";
import { Tagi } from "@components/Tagi";
import dayjs from "dayjs";

type Props = {
  projekti: ProjektiJulkinen;
  kuulutus: NahtavillaoloVaiheJulkaisuJulkinen | HyvaksymisPaatosVaiheJulkaisuJulkinen;
  uudelleenKuulutus: UudelleenKuulutus | null | undefined;
  naytaAineistoPaivanaKuulutuksenJulkaisuPaiva?: boolean;
  paatos?: boolean;
};

export default function KansalaisenAineistoNakyma({
  projekti,
  kuulutus,
  naytaAineistoPaivanaKuulutuksenJulkaisuPaiva,
  uudelleenKuulutus,
  paatos,
}: Props): ReactElement {
  const { t, lang } = useTranslation("projekti");

  const [expandedToimeksiannot, setExpandedToimeksiannot] = useState<Key[]>([]);
  const areToimeksiannotExpanded = !!expandedToimeksiannot.length;

  const velho = projekti?.velho;

  if (!projekti || !kuulutus || !velho) {
    return <></>;
  }

  let sijainti = "";
  if (velho.maakunnat) {
    sijainti = sijainti + kuntametadata.namesForMaakuntaIds(velho.maakunnat, lang).join(", ") + "; ";
  }
  if (velho.kunnat) {
    sijainti = sijainti + kuntametadata.namesForKuntaIds(velho.kunnat, lang).join(", ");
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
    <SectionContent className={paatos ? "mt-6" : "mt-8"}>
      {!paatos && <h2 className="vayla-title">{t("ui-otsikot.nahtavillaolo.nahtavilla_oleva_aineisto")}</h2>}
      {paatos && <h3 className="vayla-subtitle">{t("ui-otsikot.paatos_nahtavilla_oleva_aineisto")}</h3>}
      <Trans
        i18nKey="projekti:info.nahtavillaolo.ei-rata.suunnitelmiin_on_mahdollista"
        values={{
          kuulutusVaihePaattyyPaiva: formatDate(kuulutus.kuulutusVaihePaattyyPaiva),
        }}
        components={{ p: <p />, b: <b /> }}
      />
      {!paatos && (
        <ButtonFlat
          sx={{ marginTop: "2rem", marginBottom: "2rem" }}
          type="button"
          onClick={() => {
            if (areToimeksiannotExpanded) {
              setExpandedToimeksiannot([]);
            } else {
              setExpandedToimeksiannot(getAlaKategoryIds(aineistoKategoriat.listKategoriat()));
            }
          }}
          iconComponent={
            <span className="fa-layers">
              <FontAwesomeIcon icon="chevron-down" transform={`down-6`} flip={areToimeksiannotExpanded ? "vertical" : undefined} />
              <FontAwesomeIcon icon="chevron-up" transform={`up-6`} flip={areToimeksiannotExpanded ? "vertical" : undefined} />
            </span>
          }
        >
          {areToimeksiannotExpanded ? "Sulje" : "Avaa"} kaikki kategoriat
        </ButtonFlat>
      )}
      <AineistoKategoriaAccordion
        aineistoKategoriat={aineistoKategoriat.listKategoriat()}
        aineistot={kuulutus.aineistoNahtavilla}
        expandedState={[expandedToimeksiannot, setExpandedToimeksiannot]}
        paakategoria
        julkaisuPaiva={naytaAineistoPaivanaKuulutuksenJulkaisuPaiva ? kuulutus.kuulutusPaiva || undefined : undefined}
        alkuperainenHyvaksymisPaiva={uudelleenKuulutus?.alkuperainenHyvaksymisPaiva || undefined}
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
  alkuperainenHyvaksymisPaiva: string | undefined;
}

const AineistoKategoriaAccordion = (props: AineistoKategoriaAccordionProps) => {
  const { t } = useTranslation("aineisto");

  const aineistotKategorioittain = useMemo(() => {
    return (
      props.aineistoKategoriat?.reduce<{ kategoria: AineistoKategoria; aineisto: Aineisto[] }[]>((acc, kategoria) => {
        const kategorianAineistot = props.aineistot?.filter(
          (aineisto) =>
            kategoria.id === aineisto.kategoriaId ||
            kategoria.alaKategoriat?.some((alakategoria) => alakategoria.id === aineisto.kategoriaId)
        );
        if (props.paakategoria || !!kategorianAineistot?.length) {
          acc.push({ kategoria, aineisto: kategorianAineistot || [] });
        }
        return acc;
      }, []) || []
    );
  }, [props.aineistoKategoriat, props.aineistot, props.paakategoria]);

  const aineistoKategoriaItems: AccordionItem[] = useMemo(
    () =>
      aineistotKategorioittain.map(({ kategoria, aineisto }) => {
        return {
          title: `${t(`aineisto-kategoria-nimi.${kategoria.id}`)} (${aineisto?.length || 0})`,
          content: (
            <SuunnitelmaAineistoKategoriaContent
              aineistot={aineisto}
              kategoria={kategoria}
              expandedState={props.expandedState}
              julkaisuPaiva={props.julkaisuPaiva}
              alkuperainenHyvaksymisPaiva={props.alkuperainenHyvaksymisPaiva}
            />
          ),
          id: kategoria.id,
        };
      }),
    [aineistotKategorioittain, props.alkuperainenHyvaksymisPaiva, props.expandedState, props.julkaisuPaiva, t]
  );

  return props.aineistoKategoriat ? <HassuAccordion items={aineistoKategoriaItems} expandedState={props.expandedState} /> : null;
};

interface SuunnitelmaAineistoKategoriaContentProps {
  aineistot?: Aineisto[];
  kategoria: AineistoKategoria;
  expandedState: [React.Key[], React.Dispatch<React.Key[]>];
  julkaisuPaiva?: string | undefined;
  alkuperainenHyvaksymisPaiva: string | undefined;
}

const SuunnitelmaAineistoKategoriaContent = (props: SuunnitelmaAineistoKategoriaContentProps) => {
  const { t } = useTranslation("aineisto");
  return (
    <>
      {!!props.aineistot?.length ? (
        <Stack direction="column" rowGap={1.5}>
          {props.aineistot
            ?.filter((aineisto) => typeof aineisto.tiedosto === "string" && aineisto.kategoriaId === props.kategoria.id)
            .map((aineisto) => {
              const isUusiaineisto =
                aineisto.tuotu &&
                props.alkuperainenHyvaksymisPaiva &&
                dayjs(aineisto.tuotu).isAfter(props.alkuperainenHyvaksymisPaiva, "date");
              return (
                <Stack direction="row" alignItems="flex-end" columnGap={8} key={aineisto.dokumenttiOid}>
                  <ExtLink className="file_download" href={aineisto.tiedosto!} target="_blank" rel="noreferrer">
                    {aineisto.nimi}{" "}
                    <span className="ml-2 text-black">
                      ({aineisto.nimi.split(".").pop()}){" "}
                      {props.julkaisuPaiva ? formatDate(props.julkaisuPaiva) : aineisto.tuotu && formatDate(aineisto.tuotu)}
                    </span>
                  </ExtLink>
                  {isUusiaineisto && <Tagi>{t("aineisto:uusi-aineisto")}</Tagi>}
                </Stack>
              );
            })}
        </Stack>
      ) : (
        <p>Kategoriassa ei ole aineistoa</p>
      )}
      {!!props.aineistot?.length && (
        <AineistoKategoriaAccordion
          aineistoKategoriat={props.kategoria.alaKategoriat}
          aineistot={props.aineistot}
          expandedState={props.expandedState}
          alkuperainenHyvaksymisPaiva={props.alkuperainenHyvaksymisPaiva}
        />
      )}
    </>
  );
};
