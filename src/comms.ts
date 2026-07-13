// ============================================================================
// Digital communication math — modulation, AWGN, demod, BER (sim + theory).
// Conventions: unit average symbol energy (Es = 1); noise from Eb/N0 in dB.
// ============================================================================

export type Scheme = "BPSK" | "QPSK" | "16-QAM";
export const SCHEMES: Record<Scheme, { bits: number }> = {
  BPSK: { bits: 1 }, QPSK: { bits: 2 }, "16-QAM": { bits: 4 },
};

const S2 = Math.SQRT2;
const S10 = Math.sqrt(10);

// Gray-coded PAM-4 level for a 2-bit pair index (b_msb*2 + b_lsb)
const PAM4 = [-3, -1, 3, 1];          // 00->-3, 01->-1, 10->+3, 11->+1
const LEVELS = [-3, -1, 1, 3];
// inverse: nearest level -> [b_msb, b_lsb]
const LEVEL_TO_PAIR: Record<number, [number, number]> = {
  [-3]: [0, 0], [-1]: [0, 1], [3]: [1, 0], [1]: [1, 1],
};

export function modulate(scheme: Scheme, bits: number[]): { i: number; q: number } {
  if (scheme === "BPSK") return { i: 1 - 2 * bits[0], q: 0 };
  if (scheme === "QPSK") return { i: (1 - 2 * bits[0]) / S2, q: (1 - 2 * bits[1]) / S2 };
  // 16-QAM
  const iL = PAM4[bits[0] * 2 + bits[1]];
  const qL = PAM4[bits[2] * 2 + bits[3]];
  return { i: iL / S10, q: qL / S10 };
}

function nearest(x: number): number {
  let best = LEVELS[0];
  for (const l of LEVELS) if (Math.abs(x - l) < Math.abs(x - best)) best = l;
  return best;
}

export function demodulate(scheme: Scheme, i: number, q: number): number[] {
  if (scheme === "BPSK") return [i > 0 ? 0 : 1];
  if (scheme === "QPSK") return [i > 0 ? 0 : 1, q > 0 ? 0 : 1];
  const [bi0, bi1] = LEVEL_TO_PAIR[nearest(i * S10)];
  const [bq0, bq1] = LEVEL_TO_PAIR[nearest(q * S10)];
  return [bi0, bi1, bq0, bq1];
}

// ideal constellation points (unit average energy)
export function idealPoints(scheme: Scheme): { i: number; q: number }[] {
  const pts: { i: number; q: number }[] = [];
  const b = SCHEMES[scheme].bits;
  for (let m = 0; m < (1 << b); m++) {
    const bits = [];
    for (let k = 0; k < b; k++) bits.push((m >> (b - 1 - k)) & 1);
    pts.push(modulate(scheme, bits));
  }
  return pts;
}

// Box–Muller standard normal
export function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// noise std-dev per I/Q dimension for a given Eb/N0 (dB)
export function sigmaFor(scheme: Scheme, ebn0dB: number): number {
  const ebn0 = 10 ** (ebn0dB / 10);
  const bits = SCHEMES[scheme].bits;
  return Math.sqrt(1 / (2 * bits * ebn0)); // N0/2 with Es = 1
}

// erfc via Abramowitz–Stegun 7.1.26 ; Q(x) = 0.5 erfc(x/√2)
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  const erf = x >= 0 ? y : -y;
  return 1 - erf;
}
export const Q = (x: number) => 0.5 * erfc(x / S2);

export function berTheory(scheme: Scheme, ebn0dB: number): number {
  const ebn0 = 10 ** (ebn0dB / 10);
  if (scheme === "16-QAM") return 0.75 * Q(Math.sqrt(0.8 * ebn0)); // M-QAM approx
  return Q(Math.sqrt(2 * ebn0)); // BPSK / QPSK
}

// Monte-Carlo BER at one Eb/N0
export function berSim(scheme: Scheme, ebn0dB: number, nBits: number): number {
  const bpsym = SCHEMES[scheme].bits;
  const sigma = sigmaFor(scheme, ebn0dB);
  let errs = 0, total = 0;
  const nSym = Math.ceil(nBits / bpsym);
  const tx = new Array(bpsym);
  for (let s = 0; s < nSym; s++) {
    for (let k = 0; k < bpsym; k++) tx[k] = Math.random() < 0.5 ? 0 : 1;
    const { i, q } = modulate(scheme, tx);
    const rx = demodulate(scheme, i + sigma * gauss(), q + sigma * gauss());
    for (let k = 0; k < bpsym; k++) { if (rx[k] !== tx[k]) errs++; total++; }
  }
  return errs / total;
}

// a scatter of received symbols for the constellation view
export function scatter(scheme: Scheme, ebn0dB: number, n: number) {
  const bpsym = SCHEMES[scheme].bits;
  const sigma = sigmaFor(scheme, ebn0dB);
  const out: { i: number; q: number; err: boolean }[] = [];
  const tx = new Array(bpsym);
  for (let s = 0; s < n; s++) {
    for (let k = 0; k < bpsym; k++) tx[k] = Math.random() < 0.5 ? 0 : 1;
    const t = modulate(scheme, tx);
    const ri = t.i + sigma * gauss(), rq = t.q + sigma * gauss();
    const rx = demodulate(scheme, ri, rq);
    let err = false;
    for (let k = 0; k < bpsym; k++) if (rx[k] !== tx[k]) err = true;
    out.push({ i: ri, q: rq, err });
  }
  return out;
}
