import { H2 } from "../Headings";
import React from "react";
import SearchSection from "@components/layout/SearchSection";
import { FormProvider, UseFormReturn } from "react-hook-form";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import MenuItem from "@mui/material/MenuItem";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useTranslation from "next-translate/useTranslation";
import { HakulomakeFormValues } from "./Hakulomake";
import { SelectOption } from "../form/Select";
import { HakutulosInfo } from "./TyylitellytKomponentit";
import Trans from "next-translate/Trans";
import { focusStyleSecondary } from "@components/layout/HassuMuiThemeProvider";

type HakulomakeProps = {
  useFormReturn: UseFormReturn<HakulomakeFormValues, object>;
  kuntaOptions: SelectOption[];
  maakuntaOptions: SelectOption[];
  vaylamuotoOptions: {
    label: string;
    value: string;
  }[];
  haeSuunnitelmat: (data: HakulomakeFormValues) => void;
  hakutulostenMaara: number | null | undefined;
  nollaaHakuehdot: (e: any) => void;
};

const HakulomakeMobile = ({
  useFormReturn,
  kuntaOptions,
  maakuntaOptions,
  vaylamuotoOptions,
  haeSuunnitelmat,
  hakutulostenMaara,
  nollaaHakuehdot,
}: HakulomakeProps) => {
  const { t } = useTranslation("etusivu");

  return (
    <div role="navigation" className="bg-gray-lightest mb-4">
      <Accordion sx={{ margin: 0 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
          aria-controls="search-accordion-content"
          id="search-accordion-header"
          sx={{
            height: "64px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
            paddingLeft: 8,
            "&:focus": { ...focusStyleSecondary, backgroundColor: "#0064AF" },
          }}
        >
          <H2 sx={{ fontWeight: "normal", fontSize: "1rem", lineHeight: 1.1, color: "white", marginBottom: 0 }}>
            {t("suunnitelmien-haku")}
          </H2>
        </AccordionSummary>
        <AccordionDetails className="p-0">
          <SearchSection noDivider className="mt-0 mb-0">
            <H2 id="mainPageContent">{t("suunnitelmien-haku")}</H2>
            <FormProvider {...useFormReturn}>
              <form className="mt-4">
                <HassuGrid cols={{ xs: 1, md: 1, lg: 3, xl: 3 }}>
                  <HassuGridItem colSpan={{ xs: 1, lg: 2 }}>
                    <TextInput
                      label={t("vapaasanahaku")}
                      {...useFormReturn.register("vapaasanahaku")}
                      error={useFormReturn.formState.errors?.vapaasanahaku}
                      id="vapaasanahaku"
                    />
                  </HassuGridItem>
                  <HassuMuiSelect name="kunta" label={t("kunta")} control={useFormReturn.control} defaultValue="">
                    {kuntaOptions.map((option) => (
                      <MenuItem key={option.label} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </HassuMuiSelect>
                </HassuGrid>
                <HassuGrid cols={{ xs: 1, md: 1, lg: 3, xl: 3 }}>
                  <HassuMuiSelect name="maakunta" label={t("maakunta")} control={useFormReturn.control} defaultValue="">
                    {maakuntaOptions.map((option) => (
                      <MenuItem key={option.label} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </HassuMuiSelect>
                  <HassuMuiSelect name="vaylamuoto" label={t("vaylamuoto")} control={useFormReturn.control} defaultValue="">
                    {vaylamuotoOptions
                      .filter((option) => option.value !== "")
                      .map((option) => (
                        <MenuItem key={option.label} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                  </HassuMuiSelect>
                </HassuGrid>
                <Button
                  type="submit"
                  onClick={useFormReturn.handleSubmit(haeSuunnitelmat)}
                  primary
                  style={{ marginRight: "auto", marginTop: "1em" }}
                  endIcon="search"
                  id="hae"
                  disabled={false}
                >
                  {t("hae")}
                </Button>
              </form>
            </FormProvider>
          </SearchSection>
        </AccordionDetails>
      </Accordion>
      {hakutulostenMaara != undefined && (
        <HakutulosInfo className={"mobiili p-4"}>
          <p id="hakutulosmaara" style={{ marginBottom: "0.5rem" }}>
            <Trans i18nKey="etusivu:loytyi-n-suunnitelmaa" values={{ lkm: hakutulostenMaara }} />
          </p>
          <button id="nollaa_hakuehdot_button" onClick={nollaaHakuehdot}>
            {t("nollaa-hakuehdot")}
          </button>
        </HakutulosInfo>
      )}
    </div>
  );
};

export default HakulomakeMobile;
