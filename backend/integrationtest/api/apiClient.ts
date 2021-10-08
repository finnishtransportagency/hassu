import {
  ListaaVelhoProjektitQueryVariables,
  Projekti,
  TallennaProjektiInput,
  VelhoHakuTulos,
} from "../../src/api/apiModel";
import * as apiHandler from "../../src/apiHandler";
import { expect } from "chai";

async function searchProjectsFromVelhoAndPickFirst() {
  const input: ListaaVelhoProjektitQueryVariables = { nimi: "tampere" };
  const searchResult = (await apiHandler.handleEvent({
    info: { fieldName: apiHandler.Operation.LISTAA_VELHO_PROJEKTIT },
    arguments: input,
  } as any)) as VelhoHakuTulos[];
  // tslint:disable-next-line:no-unused-expression
  expect(searchResult).not.to.be.empty;

  return searchResult.pop().oid;
}

async function lataaProjekti(oid: string) {
  const projekti = (await apiHandler.handleEvent({
    info: { fieldName: apiHandler.Operation.LATAA_PROJEKTI },
    arguments: { oid },
  } as any)) as Projekti;

  expect(projekti.oid).to.be.equal(oid);
  return projekti;
}

async function tallennaProjekti(input: TallennaProjektiInput) {
  await apiHandler.handleEvent({
    info: { fieldName: apiHandler.Operation.TALLENNA_PROJEKTI },
    arguments: input,
  } as any);
}

export { searchProjectsFromVelhoAndPickFirst, lataaProjekti, tallennaProjekti };
