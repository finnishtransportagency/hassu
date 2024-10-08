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
import { AineistoKategoria, getAineistoKategoriat } from "common/aineistoKategoriat";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { H3, H4, H5 } from "@components/Headings";
import { AineistoLinkkiLista } from "../kansalaisnakyma/AineistoLinkkiLista";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";
import Notification, { NotificationType } from "../../notification/Notification";

type AccordioSummaryContentProps = {
  titleText: string;
  paakategoria?: boolean;
  tooltipText?: string;
};

const AccordioSummaryContent = ({ titleText, paakategoria, tooltipText }: AccordioSummaryContentProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const Heading = paakategoria ? H4 : H5;
  return (
    <div className="w-full">
      <div className="flex flex-row items-center justify-between max-w-sm">
        <Heading variant="h5" sx={{ margin: 0, alignSelf: "baseline" }}>
          {titleText}
        </Heading>
        {tooltipText && (
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onClick={(event) => {
              event.stopPropagation();
              setShowTooltip(!showTooltip);
            }}
          >
            <FontAwesomeIcon color="rgb(0, 100, 175)" size="lg" icon="info-circle" type={NotificationType.INFO_GRAY} cursor="pointer" />
          </button>
        )}
      </div>
      <Notification
        type={NotificationType.INFO_GRAY}
        className="mt-4"
        open={showTooltip}
        onClose={(event) => {
          event.stopPropagation();
          setShowTooltip(false);
        }}
        closable
        style={{ maxWidth: "40rem" }}
      >
        <p>{tooltipText}</p>
      </Notification>
    </div>
  );
};

type Props = {
  projekti: ProjektiJulkinen;
  kuulutus: NahtavillaoloVaiheJulkaisuJulkinen | HyvaksymisPaatosVaiheJulkaisuJulkinen;
  uudelleenKuulutus: UudelleenKuulutus | null | undefined;
  paatos?: boolean;
};

export default function KansalaisenAineistoNakyma({ projekti, kuulutus, uudelleenKuulutus, paatos }: Readonly<Props>): ReactElement {
  const { t } = useTranslation("projekti");

  const [expandedToimeksiannot, setExpandedToimeksiannot] = useState<Key[]>([]);
  const areToimeksiannotExpanded = !!expandedToimeksiannot.length;

  const velho = projekti?.velho;

  const aineistoKategoriat = useMemo(() => getAineistoKategoriat({ projektiTyyppi: velho.tyyppi }).listKategoriat(), [velho.tyyppi]);

  if (!projekti || !kuulutus || !velho) {
    return <></>;
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
              setExpandedToimeksiannot(getAlaKategoryIds(aineistoKategoriat));
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
          aineistoKategoriat={aineistoKategoriat}
          aineistot={kuulutus.aineistoNahtavilla}
          expandedState={[expandedToimeksiannot, setExpandedToimeksiannot]}
          paakategoria
          julkaisuPaiva={kuulutus.kuulutusPaiva ?? undefined}
          alkuperainenHyvaksymisPaiva={uudelleenKuulutus?.alkuperainenHyvaksymisPaiva ?? undefined}
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
        const kategorianAineistot = props.aineistot?.filter(aineistoIsFromCategoryOrSubcategory(kategoria));
        if (props.paakategoria || !!kategorianAineistot?.length) {
          acc.push({ kategoria, aineisto: kategorianAineistot ?? [] });
        }
        return acc;
      }, []) ?? [];

    return aineistotKategorioittain.map<AccordionItem>(({ kategoria, aineisto }) => {
      const titleText = t(`aineisto-kategoria-nimi.${kategoria.id}`) + " (" + (aineisto?.length || 0) + ")";
      const tooltipText = props.paakategoria ? t(`aineisto-kategoria-tooltip.${kategoria.id}`) : undefined;
      return {
        title: <AccordioSummaryContent titleText={titleText} paakategoria={props.paakategoria} tooltipText={tooltipText} />,
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

function aineistoIsFromCategoryOrSubcategory(kategoria: AineistoKategoria): (value: Aineisto) => boolean {
  return (aineisto) =>
    kategoria.id === aineisto.kategoriaId || !!kategoria.alaKategoriat?.some((alakategoria) => alakategoria.id === aineisto.kategoriaId);
}
