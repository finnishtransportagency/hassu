import TextInput from "@components/form/TextInput";
import SectionContent from "@components/layout/SectionContent";
import { Stack } from "@mui/material";
import { useMemo, useRef } from "react";
import useSnackbars from "src/hooks/useSnackbars";
import Button from "@components/button/Button";
import { useFormContext } from "react-hook-form";
import { TallennaHyvaksymisEsitysInput } from "@services/api";

export default function LinkkiHyvEsAineistoon({
  oid,
  hash,
}: Readonly<{
  oid: string;
  hash: string | undefined;
}>) {
  const { watch } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const formData = watch();

  const linkRef = useRef<HTMLInputElement>(null);

  const linkHref = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    return hash ? `${window?.location?.protocol}//${window?.location?.host}/suunnitelma/${oid}/hyvaksymisesitys?hash=${hash}` : undefined;
  }, [oid, hash]);

  const { showInfoMessage, showErrorMessage } = useSnackbars();

  const hiddenLinkRef = useRef<HTMLAnchorElement | null>();

  return (
    <SectionContent className="mt-16">
      <h3 className="vayla-subtitle mb-1">Linkki hyväksymisesityksen aineistoon</h3>
      <p className="mt-8 mb-8">Liitä alla...</p>
      <Stack direction="row" alignItems="end">
        <TextInput
          name="linkki"
          label={"Linkki hyväksymisesityksen aineistoon"}
          style={{ flexGrow: 1 }}
          disabled
          value={linkHref ?? "-"}
          ref={linkRef}
        />
        <a
          className="hidden"
          id={`esikatsele-hyvaksymisesitys-link`}
          target="_blank"
          rel="noreferrer"
          href={`/yllapito/projekti/${oid}/hyvaksymisesitys/esikatsele`}
          ref={(e) => {
            if (hiddenLinkRef) {
              hiddenLinkRef.current = e;
            }
          }}
        >
          Hidden link
        </a>
        <Button
          endIcon="external-link-alt"
          style={{ borderRadius: 0, textTransform: "none" }}
          type="button"
          onClick={() => {
            localStorage.setItem(`tallennaHyvaksymisEsitysInput`, JSON.stringify(formData));
            if (hiddenLinkRef.current) {
              hiddenLinkRef.current.click();
            }
          }}
        >
          Esikatsele
        </Button>
        <Button
          primary
          style={{ borderRadius: 0, textTransform: "none" }}
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
        </Button>
      </Stack>
    </SectionContent>
  );
}
