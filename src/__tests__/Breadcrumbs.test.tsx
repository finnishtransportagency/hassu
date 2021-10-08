/**
 * @jest-environment jsdom
 */

import React from "react";
import Breadcrumbs, { RouteLabels } from "@components/layout/Breadcrumbs";
import { create, act } from "react-test-renderer";
import { useRouter } from "next/router";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

interface NextRouter {
  isReady: boolean;
  pathname: string;
  asPath: string;
}

describe("Breadcrumbs", () => {
  const createObj = (router: NextRouter, routeLabels: RouteLabels) => {
    (useRouter as jest.Mock).mockReturnValue(router);
    const tree = create(<Breadcrumbs routeLabels={routeLabels} />);
    act(() => {
      tree.update(<Breadcrumbs routeLabels={routeLabels} />);
    });
    return tree;
  };

  it("renders breadcrumbs correctly on error page", () => {
    const router = {
      isReady: true,
      pathname: "/_error",
      asPath: "/yllapito/projekti/1234/?locale=fi",
    };
    const tree = createObj(router, {});
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders breadcrumbs correctly on non-mapped /tuntematon/polku/123/123 path", () => {
    const router = {
      isReady: true,
      pathname: "/tuntematon/polku/[sid]/[pid]",
      asPath: "/tuntematon/polku/123/456/?locale=fi",
    };
    const tree = createObj(router, {});
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders breadcrumbs correctly on mapped /tuntematon/polku/123/123 path", () => {
    const routeMapping: RouteLabels = {
      "/tuntematon/polku/[sid]": { label: "Testi nimi" },
      "/tuntematon/polku/[sid]/[pid]": { label: "Projektin muokkaaminen" },
    };
    const router = {
      isReady: true,
      pathname: "/tuntematon/polku/[sid]/[pid]",
      asPath: "/tuntematon/polku/123/456/?locale=fi",
    };
    const tree = createObj(router, routeMapping);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it("renders correctly on 'known' /yllapito/perusta path", () => {
    const router = {
      isReady: true,
      pathname: "/yllapito/perusta",
      asPath: "/yllapito/perusta/",
    };
    const tree = createObj(router, {});
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
