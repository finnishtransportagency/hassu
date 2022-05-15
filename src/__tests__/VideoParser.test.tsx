/**
 * @jest-environment jsdom
 */

import { parseVideoURL } from "../util/videoParser";

describe("VideoParser", () => {
  it("returns embedded youtube urls correctly", () => {
    const url = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
    const embeddedURL = parseVideoURL(url);
    expect(embeddedURL).toMatchSnapshot();
  });

  it("accepts youtube urls with v query parameters only", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ";
    const embeddedURL = parseVideoURL(url);
    expect(embeddedURL).toBeUndefined();
  });

  it("returns embedded vimeo urls correctly", () => {
    const url = "https://vimeo.com/76979871";
    const embeddedURL = parseVideoURL(url);
    expect(embeddedURL).toMatchSnapshot();
  });

  it("accepts vimeo urls with ID (number) as last part of path only", () => {
    const url = "https://player.vimeo.com/video/71994339?h=0173a63fdf";
    const embeddedURL = parseVideoURL(url);
    expect(embeddedURL).toBeUndefined();
  });

  it("returns values only for youtube or vimeo urls", () => {
    const url = "https://www.dailymotion.com/video/x3rdtfy";
    const embeddedURL = parseVideoURL(url);
    expect(embeddedURL).toBeUndefined();
  });
});
