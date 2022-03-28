/**
 * @jest-environment jsdom
 */

import React from "react";
import Perusta from "@pages/yllapito/perusta";
import { ProjektiTyyppi, VelhoHakuTulos } from "@services/api";
import { act, create } from "react-test-renderer";
import { useRouter } from "next/router";
import { componentWithTranslation } from "../test-utils";
import "../font-awesome-init";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@services/api", () => ({
  api: {
    getVelhoSuunnitelmasByName: () => {
      const hakuTulos: VelhoHakuTulos[] = [
        { __typename: "VelhoHakuTulos", oid: "1234", nimi: "Tampereen tie Hanke", tyyppi: "TIE" as ProjektiTyyppi.TIE },
      ];
      return new Promise<VelhoHakuTulos[]>((resolve) => {
        resolve(hakuTulos);
      });
    },
  },
}));

describe("Perusta", () => {
  it("renders 'Perusta' page unchanged", async () => {
    const router = {
      isReady: true,
      query: {
        projektinimi: "tampere",
      },
    };
    (useRouter as jest.Mock).mockReturnValue(router);
    const component = await componentWithTranslation(<Perusta unitTest/>);
    const tree = create(component);

    await act(async () => {
      await tree.update(component);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
