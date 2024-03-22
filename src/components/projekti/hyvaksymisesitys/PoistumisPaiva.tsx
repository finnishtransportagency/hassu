import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import SectionContent from "@components/layout/SectionContent";

export default function PoistumisPaiva({ index }: Readonly<{ index: number; kunta?: number }>) {
  return (
    <SectionContent>
      <h3 className="vayla-subtitle mb-1">Linkin voimassaoloaika</h3>
      <p className="mb-4">
        Valitse hyväksymisesityksenä toimitettavalle suunnitelmalle voimassaoloaika. Voimassaoloaikaa voi muuttaa jälkikäteen.
      </p>
      <HassuDatePickerWithController
        label="Päättyy"
        controllerProps={{
          name: `hyvaksymisesitykset.${index}.poistumisPaiva`,
        }}
        onChange={(date) => {
          if (date?.isValid()) {
            date.format("YYYY-MM-DD");
          }
        }}
      />
    </SectionContent>
  );
}
