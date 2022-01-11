/**
 * @jest-environment jsdom
 */

import React from "react";
import Breadcrumbs, { RouteLabels, generateRoutes } from "@components/layout/Breadcrumbs";
import { NextRouter, useRouter } from "next/router";
import { create, act } from "react-test-renderer";
import { componentWithTranslation } from "../test-utils";

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
    const routes = generateRoutes(router, {});
    expect(routes).toMatchSnapshot();
  });

  it("generates breadcrumbs correctly for non-mapped /tuntematon/polku/123/123 path", () => {
    const router = {
      isReady: true,
      pathname: "/tuntematon/polku/[sid]/[pid]",
      asPath: "/tuntematon/polku/123/456/?locale=fi",
    } as NextRouter;
    const routes = generateRoutes(router, {});
    expect(routes).toMatchSnapshot();
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
    const routes = generateRoutes(router, routeLabels);
    expect(routes).toMatchSnapshot();
  });

  it("renders correctly on 'known' /yllapito/perusta path", async () => {
    const router = {
      isReady: true,
      pathname: "/yllapito/perusta",
      asPath: "/yllapito/perusta/",
    };
    (useRouter as jest.Mock).mockReturnValue(router);
    const component = await componentWithTranslation(<Breadcrumbs routeLabels={{}} />);
    const tree = create(component);

    await act(async () => {
      await tree.update(component);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
