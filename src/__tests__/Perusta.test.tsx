/**
 * @jest-environment jsdom
 */

import React from "react";
import Perusta from "@pages/yllapito/perusta";
import { VelhoHakuTulos } from "@services/api";
import { create, act } from "react-test-renderer";
import { useRouter } from "next/router";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@services/api", () => ({
  api: {
    getVelhoSuunnitelmasByName: () => {
      const hakuTulos: VelhoHakuTulos[] = [
        { __typename: "VelhoHakuTulos", oid: "1234", nimi: "Tampereen tie Hanke", tyyppi: "Tie" },
      ];
      const promise = new Promise<VelhoHakuTulos[]>((resolve) => {
        resolve(hakuTulos);
      });
      return promise;
    },
  },
}));

describe("ProjektiTaulu", () => {
  it("renders 'Perusta' page unchanged", async () => {
    const router = {
      isReady: true,
      query: {
        projektinimi: "tampere",
      },
    };
    (useRouter as jest.Mock).mockReturnValue(router);
    const tree = create(<Perusta />);

    await act(async () => {
      await tree.update(<Perusta />);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
