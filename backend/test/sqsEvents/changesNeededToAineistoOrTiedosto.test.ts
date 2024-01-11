import { describe, it } from "mocha";
import { DBProjekti } from "../../src/database/model";
import { AineistoTila } from "hassu-common/graphql/apiModel";
import { changesNeededToAineistoOrTiedosto } from "../../src/sqsEvents/sqsEventHandlers/triggerAineistoTiedostoEventsBasedOnNeeds";

const chai = require("chai");
const { expect } = chai;

describe("changesNeededToAineistoOrTiedosto", () => {
  it("returns true if nahtavillaoloVaihe aineisto has aineisto ODOTTAA_TUONTIA", async () => {
    const projekti: Partial<DBProjekti> = {
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 2,
        aineistot: [
          {
            dokumenttiOid: "jotainMuuta",
            nimi: "jotainMuuta",
            tila: AineistoTila.VALMIS,
          },
          {
            dokumenttiOid: "jotain",
            nimi: "jotain",
            tila: AineistoTila.ODOTTAA_TUONTIA,
          },
        ],
      },
    };
    expect(changesNeededToAineistoOrTiedosto(projekti.vuorovaikutusKierros)).to.eql(true);
  });
});
