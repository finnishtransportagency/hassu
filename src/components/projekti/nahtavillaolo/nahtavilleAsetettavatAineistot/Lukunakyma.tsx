import IconButton from "@components/button/IconButton";
import ExtLink from "@components/ExtLink";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { Stack } from "@mui/material";
import { NahtavillaoloVaiheJulkaisu } from "@services/api";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";
import { AineistoKategoria, aineistoKategoriat, kategorianAllaOlevienAineistojenMaara } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { FunctionComponent, useMemo } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { formatDate, formatDateTime } from "src/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

export default function Lukunakyma() {
  const { data: projekti } = useProjekti();
  const { showErrorMessage, showInfoMessage } = useSnackbars();

  const julkaisu = useMemo(() => projekti?.nahtavillaoloVaiheJulkaisu, [projekti]);

  const linkHref = useMemo(() => {
    const parametrit = projekti?.nahtavillaoloVaiheJulkaisu?.lisaAineistoParametrit;
    if (typeof window === "undefined") {
      return undefined;
    }
    return `${window?.location?.protocol}//${window.location.host}/suunnitelma/${projekti?.oid}/lausuntopyyntoaineistot?hash=${parametrit?.hash}&id=${parametrit?.nahtavillaoloVaiheId}&poistumisPaiva=${parametrit?.poistumisPaiva}`;
  }, [projekti]);

  if (!projekti || !julkaisu) {
    return null;
  }

  const velhoURL = process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;

  const nahtavillaoloMenneisyydessa =
    julkaisu.kuulutusVaihePaattyyPaiva && isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day");

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <>
      <Section smallGaps>
        <h4 className="vayla-smallest-title">Nähtäville asetettu aineisto</h4>
        {nahtavillaoloMenneisyydessa ? (
          <p>
            Aineistot ovat olleet nähtävillä palvelun julkisella puolella {formatDate(julkaisu.kuulutusPaiva)}—
            {formatDate(julkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan. Nähtävilleasetetut aineistot löytyvät
            <ExtLink href={velhoURL}>Projektivelhosta</ExtLink>.
          </p>
        ) : (
          <p>
            Aineistot ovat nähtävillä palvelun julkisella puolella
            {" " + formatDate(julkaisu.kuulutusVaihePaattyyPaiva) + " "}
            saakka.
          </p>
        )}
        {!epaaktiivinen && (
          <AineistoNahtavillaAccordion
            kategoriat={aineistoKategoriat.listKategoriat()}
            julkaisu={julkaisu as NahtavillaoloVaiheJulkaisu}
            paakategoria={true}
          />
        )}
      </Section>
      {!epaaktiivinen && (
        <Section smallGaps>
          <h4 className="vayla-smallest-title">Lausuntopyyntöön liitetty lisäaineisto</h4>
          {projekti?.nahtavillaoloVaiheJulkaisu?.lisaAineistoParametrit?.poistumisPaiva && (
            <p>
              Jaa allaoleva linkki lausuntopyyntöön. Aineistot ovat nähtävillä linkin takaa
              {" " + formatDate(projekti.nahtavillaoloVaiheJulkaisu?.lisaAineistoParametrit.poistumisPaiva) + " "}
              saakka, jonka jälkeen aineistot poistuvat näkyvistä.
            </p>
          )}
          <p>
            <ExtLink sx={{ mr: 3 }} href={linkHref}>
              {linkHref}
            </ExtLink>
            <IconButton
              icon="copy"
              className="text-primary-dark"
              type="button"
              onClick={() => {
                if (!!linkHref) {
                  navigator.clipboard.writeText(linkHref);
                  showInfoMessage("Kopioitu!");
                } else {
                  showErrorMessage("Ongelma kopioinnissa!");
                }
              }}
            />
          </p>
          <HassuAccordion
            items={[
              {
                title: <span>{`Lisäaineisto (${julkaisu.lisaAineisto?.length || 0})`}</span>,
                content: (
                  <>
                    <Stack direction="column" rowGap={2}>
                      {julkaisu.lisaAineisto?.map((aineisto) => (
                        <span key={aineisto.dokumenttiOid}>
                          <HassuAineistoNimiExtLink tiedostoPolku={aineisto.tiedosto} aineistoNimi={aineisto.nimi} sx={{ mr: 3 }} />
                          {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
                        </span>
                      ))}
                    </Stack>
                  </>
                ),
              },
            ]}
          />
        </Section>
      )}
    </>
  );
}

interface AineistoNahtavillaAccordionProps {
  julkaisu: NahtavillaoloVaiheJulkaisu;
  kategoriat: AineistoKategoria[];
  paakategoria?: boolean;
}

const AineistoNahtavillaAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = ({ julkaisu, kategoriat, paakategoria }) => {
  const { t } = useTranslation("aineisto");
  const accordionItems: AccordionItem[] = useMemo(
    () =>
      kategoriat
        .filter((kategoria) => {
          return (
            julkaisu.aineistoNahtavilla && (paakategoria || kategorianAllaOlevienAineistojenMaara(julkaisu.aineistoNahtavilla, kategoria))
          );
        })
        .map<AccordionItem>((kategoria) => {
          return {
            id: kategoria.id,
            title: (
              <span>
                {t(`aineisto-kategoria-nimi.${kategoria.id}`)}
                {" (" + kategorianAllaOlevienAineistojenMaara(julkaisu.aineistoNahtavilla || [], kategoria) + ")"}
              </span>
            ),
            content: (
              <>
                {julkaisu.aineistoNahtavilla && (
                  <Stack direction="column" rowGap={2}>
                    {julkaisu.aineistoNahtavilla
                      .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                      .map((aineisto) => (
                        <span key={aineisto.dokumenttiOid}>
                          <HassuAineistoNimiExtLink
                            tiedostoPolku={aineisto.tiedosto}
                            aineistoNimi={aineisto.nimi}
                            sx={{ mr: 3 }}
                            target="_blank"
                          />
                          {aineisto.tuotu && formatDateTime(aineisto.tuotu)}
                        </span>
                      ))}
                  </Stack>
                )}
                {kategoria.alaKategoriat && <AineistoNahtavillaAccordion julkaisu={julkaisu} kategoriat={kategoria.alaKategoriat} />}
              </>
            ),
          };
        }),
    [t, julkaisu, kategoriat, paakategoria]
  );
  return !!accordionItems.length ? <HassuAccordion items={accordionItems} /> : null;
};
