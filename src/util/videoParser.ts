const youtubeBaseURL = "https://www.youtube.com/embed/";
const vimeoBaseURL = "https://player.vimeo.com/video/";
export const parseVideoURL = (url: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.includes("youtube")) {
    const youtubeID = url.split("v=")?.[1];
    return youtubeID ? youtubeBaseURL.concat(youtubeID) : undefined;
  } else if (url.includes("vimeo")) {
    const lastIndex = url.lastIndexOf("/");
    if (lastIndex < 0) {
      return undefined;
    }
    const vimeoID = url.substring(lastIndex + 1);
    if (isNaN(Number(vimeoID))) {
      return undefined;
    }
    return vimeoBaseURL.concat(vimeoID);
  }
  // not supported yet
  return undefined;
};
