// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import { groupProjektiEntitiesByType } from "../../src/database/groupProjektiEntitiesByType";
import { PaatosVaiheJulkaisu } from "../../src/database/model";
import { createJulkaisuSortKey } from "../../src/database/julkaisuItemKeys";
import { JulkaisuByPrefix, JulkaisuPrefix } from "../../src/database/model/projektiDataItem";

function createJulkaisu<P extends JulkaisuPrefix>(prefix: P, id: number): JulkaisuByPrefix<P> {
  const item = { projektiOid: "oid-1", sortKey: createJulkaisuSortKey(prefix, id), id };
  return item as JulkaisuByPrefix<P>;
}

describe("groupProjektiEntitiesByType", () => {
  it("should return empty object for empty input", () => {
    const result = groupProjektiEntitiesByType([]);
    expect(result).to.deep.equal({});
  });

  it("should group hyvaksymisPaatosVaiheJulkaisut correctly", () => {
    const julkaisu = createJulkaisu("JULKAISU#HYVAKSYMISPAATOS#", 1);
    const result = groupProjektiEntitiesByType([julkaisu]);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.have.lengthOf(1);
    expect(result.hyvaksymisPaatosVaiheJulkaisut?.[0]).to.equal(julkaisu);
    expect(result.jatkoPaatos1VaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos2VaiheJulkaisut).to.be.undefined;
  });

  it("should group jatkoPaatos1VaiheJulkaisut correctly", () => {
    const julkaisu = createJulkaisu("JULKAISU#JATKOPAATOS1#", 1);
    const result = groupProjektiEntitiesByType([julkaisu]);
    expect(result.jatkoPaatos1VaiheJulkaisut).to.have.lengthOf(1);
    expect(result.jatkoPaatos1VaiheJulkaisut?.[0]).to.equal(julkaisu);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos2VaiheJulkaisut).to.be.undefined;
  });

  it("should group jatkoPaatos2VaiheJulkaisut correctly", () => {
    const julkaisu = createJulkaisu("JULKAISU#JATKOPAATOS2#", 1);
    const result = groupProjektiEntitiesByType([julkaisu]);
    expect(result.jatkoPaatos2VaiheJulkaisut).to.have.lengthOf(1);
    expect(result.jatkoPaatos2VaiheJulkaisut?.[0]).to.equal(julkaisu);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos1VaiheJulkaisut).to.be.undefined;
  });

  it("should group mixed types correctly", () => {
    const hyv1 = createJulkaisu("JULKAISU#HYVAKSYMISPAATOS#", 1);
    const hyv2 = createJulkaisu("JULKAISU#HYVAKSYMISPAATOS#", 2);
    const jatko1 = createJulkaisu("JULKAISU#JATKOPAATOS1#", 1);
    const jatko2 = createJulkaisu("JULKAISU#JATKOPAATOS2#", 1);

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
    const entities: PaatosVaiheJulkaisu[] = [
      createJulkaisu("JULKAISU#JATKOPAATOS1#", 1),
      createJulkaisu("JULKAISU#JATKOPAATOS1#", 2),
      createJulkaisu("JULKAISU#JATKOPAATOS1#", 3),
    ];
    const result = groupProjektiEntitiesByType(entities);

    expect(result.jatkoPaatos1VaiheJulkaisut).to.have.lengthOf(3);
    expect(result.hyvaksymisPaatosVaiheJulkaisut).to.be.undefined;
    expect(result.jatkoPaatos2VaiheJulkaisut).to.be.undefined;
  });
});
