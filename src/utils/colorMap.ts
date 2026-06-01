export interface RGB {
  r: number;
  g: number;
  b: number;
}

const VIRIDIS_STOPS: RGB[] = [
  { r: 0.267, g: 0.004, b: 0.329 },
  { r: 0.283, g: 0.141, b: 0.458 },
  { r: 0.254, g: 0.265, b: 0.530 },
  { r: 0.207, g: 0.372, b: 0.553 },
  { r: 0.164, g: 0.471, b: 0.558 },
  { r: 0.128, g: 0.567, b: 0.551 },
  { r: 0.135, g: 0.659, b: 0.518 },
  { r: 0.267, g: 0.749, b: 0.441 },
  { r: 0.478, g: 0.821, b: 0.318 },
  { r: 0.741, g: 0.873, b: 0.150 },
  { r: 0.993, g: 0.906, b: 0.144 },
];

export function viridis(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  
  const numStops = VIRIDIS_STOPS.length;
  const scaledT = t * (numStops - 1);
  const idx = Math.floor(scaledT);
  const frac = scaledT - idx;
  
  if (idx >= numStops - 1) {
    return VIRIDIS_STOPS[numStops - 1];
  }
  
  const c1 = VIRIDIS_STOPS[idx];
  const c2 = VIRIDIS_STOPS[idx + 1];
  
  return {
    r: c1.r + (c2.r - c1.r) * frac,
    g: c1.g + (c2.g - c1.g) * frac,
    b: c1.b + (c2.b - c1.b) * frac,
  };
}

export function rgbToString(rgb: RGB, alpha: number = 1): string {
  return `rgba(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}, ${alpha})`;
}

export function velocityToColor(velocity: number, maxVelocity: number): RGB {
  const t = Math.min(velocity / maxVelocity, 1);
  return viridis(t);
}

export function concentrationToColor(concentration: number, maxConcentration: number = 1): RGB {
  const t = Math.min(concentration / maxConcentration, 1);
  return viridis(t);
}

export function createViridisGradient(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(x, y + height, x, y);
  
  VIRIDIS_STOPS.forEach((color, i) => {
    const stop = i / (VIRIDIS_STOPS.length - 1);
    gradient.addColorStop(stop, rgbToString(color));
  });
  
  return gradient;
}

export function generateColorLegend(stops: number = 10): { value: number; color: RGB }[] {
  const legend: { value: number; color: RGB }[] = [];
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    legend.push({
      value: t,
      color: viridis(t),
    });
  }
  return legend;
}

export function formatNumber(num: number, decimals: number = 3): string {
  if (Math.abs(num) < 0.001 && num !== 0) {
    return num.toExponential(decimals);
  }
  return num.toFixed(decimals);
}
