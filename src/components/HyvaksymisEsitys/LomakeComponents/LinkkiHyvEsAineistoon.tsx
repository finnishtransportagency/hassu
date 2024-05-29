import SectionContent from "@components/layout/SectionContent";
import { Stack, TextField } from "@mui/material";
import { useMemo, useRef } from "react";
import useSnackbars from "src/hooks/useSnackbars";
import { H4 } from "@components/Headings";
import { RectangleButton } from "@components/button/RectangleButton";

export default function LinkkiHyvEsAineistoon({
  oid,
  hash,
}: Readonly<{
  oid: string;
  hash: string | undefined;
}>) {
  const linkRef = useRef<HTMLInputElement>(null);

  const linkHref = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    return hash ? `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${oid}/hyvaksymisesitys?hash=${hash}` : undefined;
  }, [oid, hash]);

  const { showInfoMessage, showErrorMessage } = useSnackbars();

  return (
    <>
      <SectionContent>
        <H4 variant="h3">Linkki hyväksymisesityksen aineistoon</H4>
        <p>
          Liitä alla oleva linkki hyväksymisesitykseen. Linkin sisältö vastaa Traficomille toimitettavan aineistopaketin sisältöä. Linkki
          sisällytetään automaattisesti myös sähköpostiviestiin, jonka järjestelmä lähettää Traficomiin.
        </p>
      </SectionContent>
      <SectionContent>
        <Stack direction="row" alignItems="end">
          <TextField
            name="linkki"
            label="Linkki hyväksymisesityksen aineistoon"
            sx={{ flexGrow: 1 }}
            disabled
            value={linkHref ?? "-"}
            ref={linkRef}
          />
          <RectangleButton
            sx={{ marginBottom: "6px" }}
            type="button"
            disabled={!linkHref}
            onClick={() => {
              if (linkRef.current?.value) {
                navigator.clipboard.writeText(linkRef.current.value);
                showInfoMessage("Kopioitu");
              } else {
                showErrorMessage("Ongelma kopioinnissa");
              }
            }}
          >
            Kopioi linkki
          </RectangleButton>
        </Stack>
      </SectionContent>
    </>
  );
}
