import {compatibility, match, solarContext, blendSolar, evaluateSolar, bestSolarWindow} from './route/core.mjs';
import {toEngineAnswers} from './mobile-core.mjs';

export function mapMatchingAnswers(values, walk = null) {
  return walk ? [...walk.answers] : toEngineAnswers(values);
}

function resolveSolar(solar) {
  if (!solar) return null;
  return solar.sun ? solar : solarContext(solar);
}

export function roadMatchBuckets(graph, answers, solar = null, colorMode = 'combined') {
  const ctx = resolveSolar(solar);
  const buckets = Array.from({length: 102}, () => []);
  for (const edge of graph.edges) {
    let score;
    if (ctx && colorMode === 'solar') {
      score = edge.solar ? evaluateSolar(edge.solar, ctx.sun, ctx.mode).healingScore : null;
    } else {
      score = blendSolar(compatibility(edge.s, answers), edge.solar, ctx);
    }
    const bucket = score === null ? 101 : Math.max(0, Math.min(100, Math.round(score)));
    const a = graph.nodes[edge.a], b = graph.nodes[edge.b];
    buckets[bucket].push([[a[1], a[0]], [b[1], b[0]]]);
  }
  return buckets;
}

export function availableStreetPhotos(points) {
  return Array.isArray(points) ? points.filter(p => p && typeof p.image === 'string'
    && /^[^/\\]+\.(?:jpe?g|png|webp)$/i.test(p.image)
    && Array.isArray(p.xy) && p.xy.length === 2 && p.xy.every(Number.isFinite)) : [];
}

export function streetPointMatch(point, answers, solar = null) {
  const ctx = resolveSolar(solar);
  const staticScore = compatibility(point.env, answers);
  const score = blendSolar(staticScore, point.solar, ctx);
  const result = {score, groups: match(point.env, answers).map(v => v.score)};
  if (ctx) {
    result.staticScore = staticScore;
    result.light = evaluateSolar(point.solar, ctx.sun, ctx.mode);
    result.bestWindow = bestSolarWindow(point.solar, ctx.mode, ctx.sun.dayOfYear);
  }
  return result;
}
