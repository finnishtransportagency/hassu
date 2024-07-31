import React, { Key, ReactElement, useMemo, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import { formatDate } from "hassu-common/util/dateUtils";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { kuntametadata } from "hassu-common/kuntametadata";
import { H3, H4, H5 } from "@components/Headings";
import { AineistoLinkkiLista } from "../kansalaisnakyma/AineistoLinkkiLista";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";

type Props = {
  projekti: ProjektiJulkinen;
  kuulutus: NahtavillaoloVaiheJulkaisuJulkinen | HyvaksymisPaatosVaiheJulkaisuJulkinen;
  uudelleenKuulutus: UudelleenKuulutus | null | undefined;
  paatos?: boolean;
};

export default function KansalaisenAineistoNakyma({ projekti, kuulutus, uudelleenKuulutus, paatos }: Props): ReactElement {
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
    <SectionContent>
      <H3 variant="h4">
        {t(!paatos ? "ui-otsikot.nahtavillaolo.nahtavilla_oleva_aineisto" : "ui-otsikot.paatos_nahtavilla_oleva_aineisto")}
      </H3>
      <Trans
        i18nKey="projekti:info.nahtavillaolo.ei-rata.suunnitelmiin_on_mahdollista"
        values={{
          kuulutusVaihePaattyyPaiva: formatDate(kuulutus.kuulutusVaihePaattyyPaiva),
        }}
        components={{ p: <p />, b: <b /> }}
      />
      {!paatos && !isDateTimeInThePast(kuulutus.kuulutusVaihePaattyyPaiva, "end-of-day") && (
        <ButtonFlatWithIcon
          type="button"
          id="toggle_open_close_kategoriat"
          onClick={() => {
            if (areToimeksiannotExpanded) {
              setExpandedToimeksiannot([]);
            } else {
              setExpandedToimeksiannot(getAlaKategoryIds(aineistoKategoriat.listKategoriat()));
            }
          }}
          iconComponent={
            <span className="fa-layers">
              <FontAwesomeIcon icon="chevron-down" transform="down-6" flip={areToimeksiannotExpanded ? "vertical" : undefined} />
              <FontAwesomeIcon icon="chevron-up" transform="up-6" flip={areToimeksiannotExpanded ? "vertical" : undefined} />
            </span>
          }
        >
          {areToimeksiannotExpanded ? t(`aineisto:sulje_kaikki`) : t(`aineisto:avaa_kaikki`)}
        </ButtonFlatWithIcon>
      )}
      {!isDateTimeInThePast(kuulutus.kuulutusVaihePaattyyPaiva, "end-of-day") && (
        <AineistoKategoriaAccordion
          aineistoKategoriat={aineistoKategoriat.listKategoriat()}
          aineistot={kuulutus.aineistoNahtavilla}
          expandedState={[expandedToimeksiannot, setExpandedToimeksiannot]}
          paakategoria
          julkaisuPaiva={kuulutus.kuulutusPaiva || undefined}
          alkuperainenHyvaksymisPaiva={uudelleenKuulutus?.alkuperainenHyvaksymisPaiva || undefined}
        />
      )}
    </SectionContent>
  );
}

interface AineistoKategoriaAccordionProps {
  aineistoKategoriat?: AineistoKategoria[];
  aineistot?: Aineisto[] | null;
  expandedState: [React.Key[], React.Dispatch<React.Key[]>];
  paakategoria?: boolean;
  julkaisuPaiva: string | undefined;
  alkuperainenHyvaksymisPaiva: string | undefined;
}

const AineistoKategoriaAccordion = (props: AineistoKategoriaAccordionProps) => {
  const { t } = useTranslation("aineisto");

  const aineistoKategoriaItems: AccordionItem[] = useMemo(() => {
    const aineistotKategorioittain =
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
      }, []) || [];

    return aineistotKategorioittain.map<AccordionItem>(({ kategoria, aineisto }) => {
      const titleText = t(`aineisto-kategoria-nimi.${kategoria.id}`) + " (" + (aineisto?.length || 0) + ")";
      const Heading = props.paakategoria ? H4 : H5;
      return {
        title: (
          <Heading variant="h5" sx={{ margin: 0 }}>
            {titleText}
          </Heading>
        ),
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
    });
  }, [
    props.aineistoKategoriat,
    props.aineistot,
    props.alkuperainenHyvaksymisPaiva,
    props.expandedState,
    props.julkaisuPaiva,
    props.paakategoria,
    t,
  ]);

  return props.aineistoKategoriat ? <HassuAccordion items={aineistoKategoriaItems} expandedstate={props.expandedState} /> : null;
};

interface SuunnitelmaAineistoKategoriaContentProps {
  aineistot?: Aineisto[];
  kategoria: AineistoKategoria;
  expandedState: [React.Key[], React.Dispatch<React.Key[]>];
  julkaisuPaiva: string | undefined;
  alkuperainenHyvaksymisPaiva: string | undefined;
}

const SuunnitelmaAineistoKategoriaContent = (props: SuunnitelmaAineistoKategoriaContentProps) => {
  const { t } = useTranslation("aineisto");
  const kategorianAineistot = useMemo(
    () => props.aineistot?.filter((aineisto) => typeof aineisto.tiedosto === "string" && aineisto.kategoriaId === props.kategoria.id),
    [props.aineistot, props.kategoria.id]
  );

  return (
    <>
      {kategorianAineistot?.length && props.julkaisuPaiva ? (
        <AineistoLinkkiLista
          aineistot={kategorianAineistot}
          julkaisupaiva={props.julkaisuPaiva}
          alkuperainenJulkaisuPaiva={props.alkuperainenHyvaksymisPaiva}
          sx={{ marginBottom: 4 }}
        />
      ) : (
        <p>{t("ei_aineistoa")}</p>
      )}
      {!!props.aineistot?.length && (
        <AineistoKategoriaAccordion
          aineistoKategoriat={props.kategoria.alaKategoriat}
          aineistot={props.aineistot}
          expandedState={props.expandedState}
          alkuperainenHyvaksymisPaiva={props.alkuperainenHyvaksymisPaiva}
          julkaisuPaiva={props.julkaisuPaiva}
        />
      )}
    </>
  );
};
