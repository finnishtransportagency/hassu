/**
 * Middleware, joka poistaa frontend-prefixin saapuvista pyynnöistä.
 *
 * config.matcher rajaa funktion suorituksen vain haluttuihin polkuihin.
 *
 * Taustaa: pilviympäristöissä Lambda@Edge tai Cloudfront function lisää prefixin pyyntöihin
 * jotta ei autentikointia vaativa liikenne saadaan Next.js-konttiin.
 *
 */

import { NextRequest, NextResponse } from "next/server";
import { BaseConfig } from "common/BaseConfig";

const PREFIX = BaseConfig.frontendPrefix;

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  url.pathname = url.pathname.slice(PREFIX.length) || "/";
  return NextResponse.rewrite(url);
}

// Tässä pitää käyttää kovakoodattua arvoa:
// Next.js can't recognize the exported `config` field in route "/src/middleware":
// Unsupported template literal with expressions at "config.matcher[0]".
// The default config will be used instead.
// Read More - https://nextjs.org/docs/messages/invalid-page-config
export const config = {
  matcher: [`/frontend/:path*`],
};
