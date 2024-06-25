import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import SectionContent from "@components/layout/SectionContent";

export default function PoistumisPaiva({ index, kunta }: Readonly<{ index: number; kunta?: number }>) {
  const keyWord = kunta ? "lausuntoPyynnonTaydennykset" : "lausuntoPyynnot";

  return (
    <SectionContent>
      {kunta ? (
        <h3 className="vayla-small-title">Täydennysaineiston voimassaoloaika</h3>
      ) : (
        <h3 className="vayla-subtitle mb-1">Aineistolinkin voimassaoloaika</h3>
      )}
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
