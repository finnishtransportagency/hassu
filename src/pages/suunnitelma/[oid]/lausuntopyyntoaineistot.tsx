import React, { FunctionComponent, ReactElement, useMemo, useRef } from "react";
import Section from "@components/layout/Section";
import { useLisaAineisto } from "src/hooks/useLisaAineisto";
import HassuAccordion, { AccordionItem } from "@components/HassuAccordion";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory } from "common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import { Aineisto, LisaAineisto, LisaAineistot, Status } from "@services/api";
import { Stack } from "@mui/material";
import ExtLink from "@components/ExtLink";
import { formatDate } from "common/util/dateUtils";
import DownloadIcon from "@mui/icons-material/Download";
import Button from "@components/button/Button";
import { useRouter } from "next/router";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const id = typeof query.id === "string" && !Number.isNaN(Number(query.id)) ? parseInt(query.id) : undefined;
  const data: null | undefined | LisaAineistot = useLisaAineisto().data;
  const zipFormRef = useRef<HTMLFormElement>(null);
  if (!oid) {
    return <></>;
  }
  let poistumisPaiva = data?.poistumisPaiva;
  if (!poistumisPaiva) {
    return <></>;
  }

  const lataaPaketti = async () => {
    console.log("Lataa paketti ", oid, Status.NAHTAVILLAOLO);

    if (zipFormRef.current) {
      zipFormRef.current.action = `/api/projekti/${oid}/aineistopaketti` + "?vaihe=" + Status.NAHTAVILLAOLO + "&id=" + id;
      zipFormRef.current.submit();
    }
  };

  return (
    <>
      <Section noDivider>
        <p>Huomioi, että tämä sisältö on tarkasteltavissa {formatDate(poistumisPaiva)} asti, jonka jälkeen sisältö poistuu näkyvistä.</p>
        <AineistoNahtavillaAccordion
          kategoriat={[...aineistoKategoriat.listKategoriat(), new AineistoKategoria({ id: "lisaAineisto" })]}
          data={data}
        />
      </Section>
      <Section noDivider>
        <Button onClick={lataaPaketti}>
          Lataa kaikki
          <DownloadIcon className="ml-2" />
        </Button>
      </Section>
      <form ref={zipFormRef} target="_blank" method="POST">
        <input type="hidden" name="lataaPaketti" value="" />
      </form>
    </>
  );
}

interface AineistoNahtavillaAccordionProps {
  kategoriat: AineistoKategoria[];
  data?: null | LisaAineistot;
}

const AineistoNahtavillaAccordion: FunctionComponent<AineistoNahtavillaAccordionProps> = (props) => {
  const { t } = useTranslation("aineisto");
  const data = props.data;
  const aineistot: LisaAineisto[] = useMemo(
    () => [
      ...(data?.aineistot || []),
      ...(data?.lisaAineistot?.map<LisaAineisto>((aineisto) => ({ ...aineisto, kategoriaId: "lisaAineisto" })) || []),
    ],
    [data]
  );

  const accordionItems: AccordionItem[] = useMemo(
    () =>
      props.kategoriat
        .filter((kategoria) =>
          aineistot?.some(
            (aineisto) =>
              aineisto.kategoriaId === kategoria.id ||
              (aineisto.kategoriaId &&
                kategoria.alaKategoriat?.map((kategoria: AineistoKategoria) => kategoria.id)?.includes(aineisto.kategoriaId))
          )
        )
        .map<AccordionItem>((kategoria) => ({
          id: kategoria.id,
          title: (
            <span>
              {t(kategoria.id === "lisaAineisto" ? "lisa-aineisto" : `aineisto-kategoria-nimi.${kategoria.id}`)}
              {" (" + getNestedAineistoMaaraForCategory((aineistot as unknown as Aineisto[]) || [], kategoria) + ")"}
            </span>
          ),
          content: (
            <>
              {aineistot && (
                <Stack direction="column" rowGap={2}>
                  {aineistot
                    .filter((aineisto) => aineisto.kategoriaId === kategoria.id)
                    .map((aineisto, index) => (
                      <span key={index}>
                        <ExtLink
                          className="file_download"
                          href={aineisto?.linkki ? aineisto?.linkki : undefined}
                          disabled={!aineisto?.linkki}
                          sx={{ mr: 3 }}
                        >
                          {aineisto.nimi}
                        </ExtLink>
                      </span>
                    ))}
                </Stack>
              )}
              {kategoria.alaKategoriat && <AineistoNahtavillaAccordion kategoriat={kategoria.alaKategoriat} data={data} />}
            </>
          ),
        })),
    [t, props.kategoriat, aineistot, data]
  );

  return (
    <>
      <HassuAccordion items={accordionItems} />
    </>
  );
};
