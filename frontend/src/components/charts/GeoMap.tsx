// Dot-grid world map, projected by hand (equirectangular). No tiles, no external services.
// Land is a coarse set of hand-traced outlines in [longitude, latitude]; a dot is drawn
// wherever the dot centre falls inside one of them.

import { useMemo } from 'react';

type Ring = [number, number][];

const LAND: Ring[] = [
  // North America
  [[-168, 66], [-162, 70], [-140, 70], [-120, 72], [-95, 72], [-80, 73], [-62, 66], [-55, 52], [-66, 45], [-70, 42], [-75, 35], [-81, 31], [-81, 25], [-84, 30], [-90, 29], [-97, 27], [-97, 21], [-91, 19], [-87, 21], [-88, 16], [-83, 10], [-78, 8], [-80, 7], [-86, 11], [-92, 15], [-105, 20], [-110, 24], [-112, 30], [-118, 34], [-124, 40], [-124, 48], [-133, 56], [-150, 60], [-165, 60], [-168, 66]],
  // Greenland
  [[-55, 60], [-43, 60], [-20, 70], [-18, 80], [-40, 83], [-65, 80], [-72, 77], [-55, 68]],
  // Iceland
  [[-24, 64], [-13, 64], [-14, 66], [-22, 66.5]],
  // South America
  [[-80, 8], [-75, 11], [-62, 11], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -35], [-65, -42], [-68, -55], [-74, -50], [-72, -35], [-71, -18], [-81, -5], [-80, 8]],
  // Eurasia
  [[-10, 36], [-9, 43], [-1, 46], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 61], [14, 67], [24, 71], [40, 68], [60, 70], [80, 73], [100, 77], [120, 73], [140, 72], [160, 70], [180, 68], [180, 64], [170, 60], [160, 58], [155, 50], [140, 52], [135, 43], [129, 41], [129, 35], [126, 35], [122, 30], [120, 22], [110, 20], [108, 12], [105, 9], [100, 13], [100, 6], [103, 1], [98, 8], [97, 17], [92, 21], [88, 22], [80, 15], [78, 8], [73, 17], [72, 21], [67, 24], [58, 22], [52, 16], [43, 13], [39, 21], [34, 28], [35, 36], [27, 37], [26, 41], [23, 38], [20, 40], [16, 38], [13, 45], [3, 43], [-1, 37], [-6, 36], [-10, 36]],
  // Africa
  [[-17, 15], [-17, 21], [-13, 28], [-6, 36], [10, 37], [11, 33], [20, 31], [32, 31], [34, 28], [43, 12], [51, 12], [42, -1], [40, -10], [40, -16], [35, -24], [32, -29], [27, -34], [20, -35], [17, -29], [12, -17], [13, -6], [9, -1], [9, 4], [5, 6], [-5, 5], [-8, 4], [-13, 8], [-17, 15]],
  // Madagascar
  [[44, -25], [48, -25], [50, -15], [49, -12], [44, -16]],
  // Great Britain and Ireland
  [[-5, 50], [1.5, 51], [2, 53], [-2, 56], [-3, 59], [-6, 58], [-5, 55], [-3, 54], [-5, 52]],
  [[-10, 51.5], [-6, 52], [-5.5, 55], [-8, 55.5], [-10, 54]],
  // Japan
  [[130, 31], [132, 34], [135, 34], [140, 36], [141, 40], [142, 45], [145, 44], [141, 41], [140, 35], [136, 33], [131, 31]],
  // Sumatra, Borneo, Java
  [[95, 5], [98, 4], [106, -6], [104, -6], [95, 3]],
  [[109, 1], [110, -2], [116, -4], [119, 1], [117, 7], [113, 3]],
  [[105, -6], [114, -7], [114, -8.5], [105, -7]],
  // Australia
  [[114, -22], [114, -34], [118, -35], [124, -33], [131, -31], [138, -35], [141, -38], [147, -38], [150, -37], [153, -28], [153, -25], [146, -19], [142, -11], [136, -12], [131, -11], [126, -14], [122, -18], [114, -22]],
  // New Zealand
  [[172, -34], [178, -38], [174, -41.5], [171, -45], [167, -46], [170, -42], [174, -39]],
];

function inside([x, y]: [number, number], ring: Ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const W = 720;
const H = 300;
const LAT_TOP = 80;
const LAT_BOTTOM = -58;
export function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * W, ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * H];
}

let dotCache: [number, number][] | null = null;
function landDots(step = 3): [number, number][] {
  if (dotCache) return dotCache;
  const out: [number, number][] = [];
  for (let lat = LAT_TOP - step / 2; lat > LAT_BOTTOM; lat -= step) {
    for (let lon = -180 + step / 2; lon < 180; lon += step) {
      if (LAND.some((r) => inside([lon, lat], r))) out.push(project(lon, lat));
    }
  }
  dotCache = out;
  return out;
}

export interface GeoPoint {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: 'current' | 'sent' | 'received';
}

export function GeoMap({ points, title }: { points: GeoPoint[]; title: string }) {
  const dots = useMemo(() => landDots(), []);
  const current = points.find((p) => p.kind === 'current');
  return (
    <figure className="geo">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${points.map((p) => `${p.label} (${p.kind})`).join('; ')}`}>
        <title>{title}</title>
        {[-30, 0, 30, 60].map((lat) => {
          const [, y] = project(0, lat);
          return <line key={lat} x1={0} x2={W} y1={y} y2={y} stroke="var(--line)" strokeWidth={0.6} strokeDasharray={lat === 0 ? '0' : '2 4'} />;
        })}
        {dots.map(([x, y], i) => (
          <rect key={i} x={x - 1} y={y - 1} width={2} height={2} fill="var(--line)" />
        ))}
        {current &&
          points
            .filter((p) => p.kind !== 'current')
            .map((p) => {
              const [x1, y1] = project(current.lon, current.lat);
              const [x2, y2] = project(p.lon, p.lat);
              const mx = (x1 + x2) / 2;
              const my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.18 - 10;
              return <path key={`arc-${p.id}`} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />;
            })}
        {points.map((p) => {
          const [x, y] = project(p.lon, p.lat);
          const isCur = p.kind === 'current';
          return (
            <g key={p.id}>
              {isCur && <rect className="geo-pulse" x={x - 9} y={y - 9} width={18} height={18} fill="none" stroke="var(--brand-bright)" strokeWidth={1.2} />}
              {p.kind === 'received' ? (
                <rect x={x - 4} y={y - 4} width={8} height={8} fill="var(--ink)" stroke="var(--paper)" strokeWidth={1.4} />
              ) : (
                <rect x={x - (isCur ? 5 : 4)} y={y - (isCur ? 5 : 4)} width={isCur ? 10 : 8} height={isCur ? 10 : 8} fill={isCur ? 'var(--brand-bright)' : 'var(--paper)'} />
              )}
              <text x={x + 10} y={y + 4} fontSize={11} fill={isCur ? 'var(--white)' : 'var(--muted)'} fontFamily="var(--font-mono)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="geo-legend">
        <span>
          <span className="legend-sq" style={{ background: 'var(--brand-bright)' }} aria-hidden="true" /> This transaction
        </span>
        <span>
          <span className="legend-sq" style={{ background: 'var(--paper)' }} aria-hidden="true" /> Other transactions sent by the customer
        </span>
        <span>
          <span className="legend-sq legend-hollow" aria-hidden="true" /> Received by the customer, plotted at the sender location
        </span>
      </figcaption>
    </figure>
  );
}
