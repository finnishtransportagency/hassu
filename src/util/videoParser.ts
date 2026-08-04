// Contains code generated or recommended by Amazon Q
const youtubeBaseURL = "https://www.youtube.com/embed/";
const vimeoBaseURL = "https://player.vimeo.com/video/";

const YOUTUBE_HOSTNAMES = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"]);
const VIMEO_HOSTNAMES = new Set(["vimeo.com", "www.vimeo.com"]);

export const parseVideoURL = (url: string): string | undefined => {
  if (!url) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const { hostname, pathname, searchParams } = parsed;

  if (YOUTUBE_HOSTNAMES.has(hostname)) {
    const videoId = hostname === "youtu.be" ? pathname.slice(1).split("?")[0] : (searchParams.get("v") ?? undefined);
    return videoId ? youtubeBaseURL + videoId : undefined;
  }

  if (VIMEO_HOSTNAMES.has(hostname)) {
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    return lastSegment && !isNaN(Number(lastSegment)) ? vimeoBaseURL + lastSegment : undefined;
  }

  return undefined;
};
