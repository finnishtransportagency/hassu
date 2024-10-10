import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { H4 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { ReactElement } from "react";

export interface HyvaksymisEsitysEnnakkoNeuvotteluProps {
  ennakkoneuvottelu?: boolean;
}

export default function LinkinVoimassaoloaika({ ennakkoneuvottelu }: HyvaksymisEsitysEnnakkoNeuvotteluProps): ReactElement {
  return (
    <SectionContent>
      <H4 variant="h3">{ennakkoneuvottelu ? "Suunitelmalinkin voimassaoloaika" : "Linkin voimassaoloaika"}</H4>
      <p>
        {ennakkoneuvottelu
          ? "Valitse ennakkoneuvotteluun toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaikaa voi muuttaa jälkikäteen."
          : "Valitse hyväksymisesityksenä toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaikaa voi muuttaa jälkikäteen."}
      </p>
      <div>
        <HassuDatePickerWithController
          label="Voimassaoloaika päättyy"
          controllerProps={{
            name: ennakkoneuvottelu ? "muokattavaEnnakkoNeuvottelu.poistumisPaiva" : "muokattavaHyvaksymisEsitys.poistumisPaiva",
          }}
          disablePast
          onChange={(date) => {
            if (date?.isValid()) {
              date.format("YYYY-MM-DD");
            }
          }}
        />
      </div>
    </SectionContent>
  );
}
