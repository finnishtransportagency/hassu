/**
 * @jest-environment jsdom
 */

import React from "react";
import Breadcrumbs, { RouteLabels, generateRoutes } from "@components/layout/Breadcrumbs";
import { create, act } from "react-test-renderer";
import { NextRouter, useRouter } from "next/router";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

describe("Breadcrumbs", () => {
  it("generates breadcrumbs correctly for error page", () => {
    const router = {
      isReady: true,
      pathname: "/_error",
      asPath: "/yllapito/projekti/1234/?locale=fi",
    } as NextRouter;
    const tree = generateRoutes(router, {});
    expect(tree).toMatchSnapshot();
  });

  it("generates breadcrumbs correctly for non-mapped /tuntematon/polku/123/123 path", () => {
    const router = {
      isReady: true,
      pathname: "/tuntematon/polku/[sid]/[pid]",
      asPath: "/tuntematon/polku/123/456/?locale=fi",
    } as NextRouter;
    const tree = generateRoutes(router, {});
    expect(tree).toMatchSnapshot();
  });

  it("generates breadcrumbs correctly for /tuntematon/polku/123/123 path", () => {
    const routeLabels: RouteLabels = {
      "/tuntematon/polku/[sid]": { label: "Testi nimi" },
      "/tuntematon/polku/[sid]/[pid]": { label: "Projektin muokkaaminen" },
    };
    const router = {
      isReady: true,
      pathname: "/tuntematon/polku/[sid]/[pid]",
      asPath: "/tuntematon/polku/123/456/?locale=fi",
    } as NextRouter;
    const tree = generateRoutes(router, routeLabels);
    expect(tree).toMatchSnapshot();
  });

  it("renders correctly on 'known' /yllapito/perusta path", () => {
    const router = {
      isReady: true,
      pathname: "/yllapito/perusta",
      asPath: "/yllapito/perusta/",
    };
    (useRouter as jest.Mock).mockReturnValue(router);
    const tree = create(<Breadcrumbs routeLabels={{}} />);
    act(() => {
      tree.update(<Breadcrumbs routeLabels={{}} />);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
