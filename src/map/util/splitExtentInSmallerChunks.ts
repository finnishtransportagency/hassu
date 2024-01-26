import { ProjectionLike, transform } from "ol/proj";
import { Extent } from "ol/extent";

export type SplitExtentInSmallerChunksOptions = {
  extent: Extent;
  chunkSquareSideLength: number;
  dataProj: ProjectionLike;
  viewProj: ProjectionLike;
};

export function splitExtentInSmallerChunks({ extent, chunkSquareSideLength, dataProj, viewProj }: SplitExtentInSmallerChunksOptions) {
  const [minX, minY] = coordViewToData([extent[0], extent[1]], dataProj, viewProj);
  const [maxX, maxY] = coordViewToData([extent[2], extent[3]], dataProj, viewProj);

  const xRanges = splitRange(minX, maxX, chunkSquareSideLength);
  const yRanges = splitRange(minY, maxY, chunkSquareSideLength);

  const allExtents = xRanges.reduce<Extent[]>((extents1, xRange) => {
    extents1.push(
      ...yRanges.reduce<Extent[]>((extents2, yRange) => {
        extents2.push([xRange[0], yRange[0], xRange[1], yRange[1]]);
        return extents2;
      }, [])
    );
    return extents1;
  }, []);
  return allExtents;
}
function coordViewToData(coord: number[], dataProj: ProjectionLike, viewProj: ProjectionLike) {
  if (viewProj == dataProj) {
    return coord;
  }
  return transform(coord, viewProj, dataProj);
}
function splitRange(rangeStart: number, rangeEnd: number, intervalSize: number) {
  const rangeDifference = rangeEnd - rangeStart;
  const numIntervals = rangeDifference / intervalSize;
  const intervals = [];

  for (let i = 0; i < numIntervals; i++) {
    const start = rangeStart + i * intervalSize;
    const end = Math.min(start + intervalSize, rangeEnd);
    intervals.push([start, end]);
  }
  return intervals;
}
