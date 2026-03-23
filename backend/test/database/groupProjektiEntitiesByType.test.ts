// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import { groupProjektiEntitiesByType } from "../../src/database/groupProjektiEntitiesByType";
import {
  HyvaksymisPaatosVaiheJulkaisu,
  JatkoPaatos1VaiheJulkaisu,
  JatkoPaatos2VaiheJulkaisu,
  PaatosVaiheJulkaisu,
} from "../../src/database/model";
import { createJulkaisuSortKey } from "../../src/database/julkaisuItemKeys";

function createHyvaksymisJulkaisu(id: number): HyvaksymisPaatosVaiheJulkaisu {
  return { projektiOid: "oid-1", sortKey: createJulkaisuSortKey("JULKAISU#HYVAKSYMISPAATOS#", id), id } as HyvaksymisPaatosVaiheJulkaisu;
}

function createJatko1Julkaisu(id: number): JatkoPaatos1VaiheJulkaisu {
  return { projektiOid: "oid-1", sortKey: createJulkaisuSortKey("JULKAISU#JATKOPAATOS1#", id), id } as JatkoPaatos1VaiheJulkaisu;
}

function createJatko2Julkaisu(id: number): JatkoPaatos2VaiheJulkaisu {
  return { projektiOid: "oid-1", sortKey: createJulkaisuSortKey("JULKAISU#JATKOPAATOS2#", id), id } as JatkoPaatos2VaiheJulkaisu;
}

describe("groupProjektiEntitiesByType", () => {
  it("should return empty object for empty input", () => {
    const result = groupProjektiEntitiesByType([]);
    expect(result).to.deep.equal({});
  });

  it("should group hyvaksymisPaatosVaiheJulkaisut correctly", () => {
    const julkaisu = createHyvaksymisJulkaisu(1);
    const result = groupProjektiEntitiesByType([julkaisu]);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.have.lengthOf(1);
    expect(result.hyvaksymisPaatosVaiheJulkaisut?.[0]).to.equal(julkaisu);
    expect(result.jatkoPaatos1VaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos2VaiheJulkaisut).to.be.undefined;
  });

  it("should group jatkoPaatos1VaiheJulkaisut correctly", () => {
    const julkaisu = createJatko1Julkaisu(1);
    const result = groupProjektiEntitiesByType([julkaisu]);
    expect(result.jatkoPaatos1VaiheJulkaisut).to.have.lengthOf(1);
    expect(result.jatkoPaatos1VaiheJulkaisut?.[0]).to.equal(julkaisu);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos2VaiheJulkaisut).to.be.undefined;
  });

  it("should group jatkoPaatos2VaiheJulkaisut correctly", () => {
    const julkaisu = createJatko2Julkaisu(1);
    const result = groupProjektiEntitiesByType([julkaisu]);
    expect(result.jatkoPaatos2VaiheJulkaisut).to.have.lengthOf(1);
    expect(result.jatkoPaatos2VaiheJulkaisut?.[0]).to.equal(julkaisu);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos1VaiheJulkaisut).to.be.undefined;
  });

  it("should group mixed types correctly", () => {
    const hyv1 = createHyvaksymisJulkaisu(1);
    const hyv2 = createHyvaksymisJulkaisu(2);
    const jatko1 = createJatko1Julkaisu(1);
    const jatko2 = createJatko2Julkaisu(1);

    const entities: PaatosVaiheJulkaisu[] = [hyv1, jatko1, hyv2, jatko2];
    const result = groupProjektiEntitiesByType(entities);

    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.have.lengthOf(2);
    expect(result.hyvaksymisPaatosVaiheJulkaisut?.[0]).to.equal(hyv1);
    expect(result.hyvaksymisPaatosVaiheJulkaisut?.[1]).to.equal(hyv2);
    expect(result.jatkoPaatos1VaiheJulkaisut).to.have.lengthOf(1);
    expect(result.jatkoPaatos1VaiheJulkaisut?.[0]).to.equal(jatko1);
    expect(result.jatkoPaatos2VaiheJulkaisut).to.have.lengthOf(1);
    expect(result.jatkoPaatos2VaiheJulkaisut?.[0]).to.equal(jatko2);
  });

  it("should handle multiple julkaisut of same type", () => {
    const entities: PaatosVaiheJulkaisu[] = [createJatko1Julkaisu(1), createJatko1Julkaisu(2), createJatko1Julkaisu(3)];
    const result = groupProjektiEntitiesByType(entities);

    expect(result.jatkoPaatos1VaiheJulkaisut).to.have.lengthOf(3);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos2VaiheJulkaisut).to.be.undefined;
  });
});
