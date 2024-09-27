import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import SectionContent from "@components/layout/SectionContent";
import { H3 } from "../../Headings";

export default function PoistumisPaiva({ index, kunta }: Readonly<{ index: number; kunta?: number }>) {
  const keyWord = kunta ? "lausuntoPyynnonTaydennykset" : "lausuntoPyynnot";

  return (
    <SectionContent>
      {kunta ? <H3>Täydennysaineiston voimassaoloaika</H3> : <H3 className="mb-1">Aineistolinkin voimassaoloaika</H3>}
      <p className="mb-6">
        Valitse {kunta ? "lausuntopyynnön täydennyksen" : "lausuntopyynnön"} sisällölle voimassaoloaika. Linkki ja sen sisältö on
        tarkasteltavissa alla olevaan päivämäärään saakka. Päivämäärää on mahdollista päivittää jälkikäteen.
      </p>
      <HassuDatePickerWithController
        label="Päättyy"
        controllerProps={{
          name: `${keyWord}.${index}.poistumisPaiva`,
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
