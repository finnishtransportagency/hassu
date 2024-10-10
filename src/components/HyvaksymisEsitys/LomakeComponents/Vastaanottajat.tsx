import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H3 } from "@components/Headings";
import { Stack, styled } from "@mui/system";
import { ReactElement, useCallback } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useIsBelowBreakpoint } from "src/hooks/useIsSize";
import { HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { HyvaksymisEsitysEnnakkoNeuvotteluProps } from "./LinkinVoimassaoloaika";
import { EnnakkoneuvotteluForm } from "@pages/yllapito/projekti/[oid]/ennakkoneuvottelu";

export default function Vastaanottajat({ ennakkoneuvottelu }: HyvaksymisEsitysEnnakkoNeuvotteluProps): ReactElement {
  const { control } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { fields, remove, append } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.vastaanottajat`,
    control,
  });

  const addNew = useCallback(() => append({ sahkoposti: "" }), [append]);

  const isMobile = useIsBelowBreakpoint("md");

  return (
    <>
      <H3 variant="h2">{ennakkoneuvottelu ? "Ennakkoneuvotteluun toimitettavan suunnitelman" : "Hyväksymisesityksen"} vastaanottajat</H3>
      <p>
        Lisää lähetettävälle {ennakkoneuvottelu ? "ennakkoneuvottelulle" : "hyväksymisesitykselle"} vastaanottaja. Jos{" "}
        {ennakkoneuvottelu ? "ennakkoneuvottelu" : "hyväksymisesitys"} pitää lähettää useammalle kuin yhdelle vastaanottajalle, lisää uusi
        rivi Lisää uusi -painikkeella.
      </p>
      {fields.map((field, index) => (
        <Stack direction="row" key={field.id}>
          <TextFieldWithController
            label="Sähköpostiosoite"
            sx={{ minWidth: { md: "335px" } }}
            fullWidth={isMobile}
            controllerProps={{
              control,
              name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.vastaanottajat.${index}.sahkoposti`,
            }}
          />
          {!!index && (
            <IconButtonWrapper>
              <IconButton
                type="button"
                onClick={() => {
                  remove(index);
                }}
                icon="trash"
              />
            </IconButtonWrapper>
          )}
        </Stack>
      ))}
      <Button onClick={addNew} type="button" id="lisaa_uusi_vastaanottaja">
        Lisää uusi +
      </Button>
    </>
  );
}

const IconButtonWrapper = styled("div")({ display: "flex", alignItems: "end" });
