import { useEffect, useRef, useState } from "react";
import {
  Scheme, SCHEMES, idealPoints, scatter, berSim, berTheory, sigmaFor,
} from "./comms";

type Tab = "Analog" | "Constellation" | "BER Curve";
const TABS: Tab[] = ["Analog", "Constellation", "BER Curve"];

export default function App() {
  const [tab, setTab] = useState<Tab>("Analog");
  return (
    <div className="app">
      <header>
        <div className="mark">≈</div>
        <div>
          <h1>COMMS SIMULATOR</h1>
          <p>Modulation · AWGN channel · constellation diagrams · Monte-Carlo BER vs theory</p>
        </div>
        <div className="badges">
          <a className="labbench-badge" href="https://labbench-hub.vercel.app/" target="_blank" rel="noopener noreferrer">⚡ LabBench</a>
          <a className="src" href="https://dhananjay-kumar-seth.vercel.app/" target="_blank" rel="noopener noreferrer">ECE Portfolio · Dhananjay Seth</a>
        </div>
      </header>
      <nav className="tabs">
        {TABS.map((t) => <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === "Analog" && <Analog />}
      {tab === "Constellation" && <Constellation />}
      {tab === "BER Curve" && <BER />}
      <footer>Unit-energy symbols · AWGN via Box–Muller · Q(x)=½·erfc(x/√2) · all math from scratch, no DSP libraries.</footer>
    </div>
  );
}

// ---------------- Analog AM / FM ----------------
function Analog() {
  const [type, setType] = useState<"AM" | "FM">("AM");
  const [fm, setFm] = useState(3);
  const [fc, setFc] = useState(30);
  const [idx, setIdx] = useState(0.7);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = cv.current!.getContext("2d")!;
    const W = cv.current!.width, H = cv.current!.height;
    c.fillStyle = "#080d14"; c.fillRect(0, 0, W, H);
    const lanes = 3, lh = H / lanes;
    const labels = ["message  m(t)", "carrier  c(t)", type === "AM" ? "AM  (1+μ·m)·cos" : "FM  cos(ωc t + β·sin)"];
    const colors = ["#38bdf8", "#64748b", "#f472b6"];
    for (let L = 0; L < lanes; L++) {
      const midY = L * lh + lh / 2;
      c.strokeStyle = "#16202b"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, midY); c.lineTo(W, midY); c.stroke();
      c.fillStyle = colors[L]; c.font = "11px ui-monospace, monospace";
      c.fillText(labels[L], 8, L * lh + 14);
      c.strokeStyle = colors[L]; c.lineWidth = 2; c.beginPath();
      for (let x = 0; x <= W; x++) {
        const t = x / W;
        const m = Math.cos(2 * Math.PI * fm * t);
        let y = 0;
        if (L === 0) y = m;
        else if (L === 1) y = Math.cos(2 * Math.PI * fc * t);
        else if (type === "AM") y = (1 + idx * m) * Math.cos(2 * Math.PI * fc * t) / (1 + idx);
        else y = Math.cos(2 * Math.PI * fc * t + idx * 8 * Math.sin(2 * Math.PI * fm * t));
        const py = midY - y * (lh * 0.4);
        x === 0 ? c.moveTo(x, py) : c.lineTo(x, py);
      }
      c.stroke();
      // AM envelope
      if (L === 2 && type === "AM") {
        c.strokeStyle = "#f472b655"; c.setLineDash([4, 4]);
        for (const sgn of [1, -1]) {
          c.beginPath();
          for (let x = 0; x <= W; x++) {
            const t = x / W, m = Math.cos(2 * Math.PI * fm * t);
            const env = sgn * (1 + idx * m) / (1 + idx);
            const py = midY - env * (lh * 0.4);
            x === 0 ? c.moveTo(x, py) : c.lineTo(x, py);
          }
          c.stroke();
        }
        c.setLineDash([]);
      }
    }
  }, [type, fm, fc, idx]);

  return (
    <div className="panel">
      <canvas ref={cv} width={880} height={300} />
      <div className="row">
        <div className="seg">
          {(["AM", "FM"] as const).map((t) => <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t}</button>)}
        </div>
        <Slider label="Message freq  fm" v={fm} min={1} max={8} step={0.5} on={setFm} c="#38bdf8" />
        <Slider label="Carrier freq  fc" v={fc} min={12} max={60} step={1} on={setFc} c="#94a3b8" />
        <Slider label={type === "AM" ? "Mod index  μ" : "Mod index  β"} v={idx} min={0} max={type === "AM" ? 1.4 : 1} step={0.05} on={setIdx} c="#f472b6" />
      </div>
      <p className="hint">
        {type === "AM"
          ? <>Push <b>μ &gt; 1</b> and the envelope crosses zero — that's <b>over-modulation</b>, where an envelope detector can no longer recover the message.</>
          : <>In <b>FM</b> the carrier frequency swings with the message; raise <b>β</b> to widen the deviation (Carson's-rule bandwidth grows).</>}
      </p>
    </div>
  );
}

// ---------------- Constellation ----------------
function Constellation() {
  const [scheme, setScheme] = useState<Scheme>("16-QAM");
  const [snr, setSnr] = useState(18);
  const [n, setN] = useState(1200);
  const [errRate, setErrRate] = useState(0);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const pts = scatter(scheme, snr, n);
    const errs = pts.filter((p) => p.err).length;
    setErrRate(errs / n);
    const c = cv.current!.getContext("2d")!;
    const S = cv.current!.width, H = cv.current!.height;
    c.fillStyle = "#080d14"; c.fillRect(0, 0, S, H);
    const cx = S / 2, cy = H / 2, R = Math.min(S, H) * 0.40; // scale so ±1.4 fits
    const map = (v: number) => v / 1.5 * R;
    // axes
    c.strokeStyle = "#1a2430"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, cy); c.lineTo(S, cy); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke();
    c.fillStyle = "#3f5163"; c.font = "11px ui-monospace, monospace";
    c.fillText("I", S - 14, cy - 6); c.fillText("Q", cx + 6, 12);
    // received cloud
    for (const p of pts) {
      c.fillStyle = p.err ? "rgba(244,63,94,0.8)" : "rgba(56,189,248,0.5)";
      c.fillRect(cx + map(p.i) - 1, cy - map(p.q) - 1, 2, 2);
    }
    // ideal points
    for (const ip of idealPoints(scheme)) {
      c.beginPath(); c.arc(cx + map(ip.i), cy - map(ip.q), 5, 0, 7);
      c.fillStyle = "#fde047"; c.fill();
      c.strokeStyle = "#0a0f16"; c.lineWidth = 1.5; c.stroke();
    }
  }, [scheme, snr, n]);

  return (
    <div className="panel">
      <div className="two">
        <canvas ref={cv} width={420} height={420} />
        <div className="side">
          <div className="block">
            <span className="blabel">Scheme</span>
            <div className="seg col">
              {(Object.keys(SCHEMES) as Scheme[]).map((s) => (
                <button key={s} className={scheme === s ? "on" : ""} onClick={() => setScheme(s)}>{s} · {SCHEMES[s].bits} bit/sym</button>
              ))}
            </div>
          </div>
          <Slider label="Eb/N0 (SNR)" v={snr} min={0} max={30} step={0.5} unit=" dB" on={setSnr} c="#38bdf8" wide />
          <Slider label="Symbols" v={n} min={200} max={4000} step={100} on={setN} c="#94a3b8" wide />
          <div className="readout">
            <div><span className="ro-v">{(errRate * 100).toFixed(2)}%</span><span className="ro-l">symbol errors (yellow=ideal, red=misread)</span></div>
            <div><span className="ro-v">{sigmaFor(scheme, snr).toFixed(3)}</span><span className="ro-l">noise σ per I/Q axis</span></div>
          </div>
        </div>
      </div>
      <p className="hint">Drop the <b>SNR</b> and watch the clouds smear until they cross the decision boundaries — red dots are symbols the receiver got wrong. Higher-order <b>16-QAM</b> packs more bits/symbol but breaks down at far higher SNR than <b>BPSK</b>.</p>
    </div>
  );
}

// ---------------- BER curve ----------------
function BER() {
  const [scheme, setScheme] = useState<Scheme>("BPSK");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ db: number; sim: number; th: number }[]>([]);
  const cv = useRef<HTMLCanvasElement>(null);

  function run() {
    setBusy(true);
    setTimeout(() => {
      const out: { db: number; sim: number; th: number }[] = [];
      for (let db = 0; db <= 14; db++) {
        out.push({ db, sim: berSim(scheme, db, 60000), th: berTheory(scheme, db) });
      }
      setData(out); setBusy(false);
    }, 30);
  }
  useEffect(() => { run(); /* eslint-disable-next-line */ }, [scheme]);

  useEffect(() => {
    const c = cv.current!.getContext("2d")!;
    const W = cv.current!.width, H = cv.current!.height;
    const padL = 52, padB = 34, padT = 14, padR = 14;
    c.fillStyle = "#080d14"; c.fillRect(0, 0, W, H);
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const xdb = (db: number) => x0 + (db / 14) * (x1 - x0);
    const yber = (b: number) => { const e = Math.max(-5, Math.log10(Math.max(b, 1e-6))); return y0 + (-e / 5) * (y1 - y0); };
    // grid
    c.strokeStyle = "#16202b"; c.fillStyle = "#3f5163"; c.font = "10px ui-monospace, monospace"; c.lineWidth = 1;
    for (let e = 0; e >= -5; e--) {
      const y = yber(10 ** e); c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
      c.fillText(e === 0 ? "1" : `1e${e}`, 6, y + 3);
    }
    for (let db = 0; db <= 14; db += 2) { const x = xdb(db); c.strokeStyle = "#111a24"; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); c.fillStyle = "#3f5163"; c.fillText(db + "", x - 5, y1 + 16); }
    c.fillStyle = "#64788f"; c.fillText("Eb/N0 (dB)", (x0 + x1) / 2 - 26, H - 4); c.save(); c.translate(12, (y0 + y1) / 2 + 18); c.rotate(-Math.PI / 2); c.fillText("BER", 0, 0); c.restore();
    if (!data.length) return;
    // theory line
    c.strokeStyle = "#64748b"; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath();
    data.forEach((d, i) => { const x = xdb(d.db), y = yber(d.th); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
    // sim line + points
    c.strokeStyle = "#38bdf8"; c.lineWidth = 2.5; c.beginPath();
    data.forEach((d, i) => { const x = xdb(d.db), y = yber(d.sim); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    for (const d of data) { c.fillStyle = "#fde047"; c.beginPath(); c.arc(xdb(d.db), yber(d.sim), 3, 0, 7); c.fill(); }
    // legend
    c.fillStyle = "#38bdf8"; c.fillText("● simulated (Monte-Carlo)", x1 - 180, y0 + 14);
    c.fillStyle = "#94a3b8"; c.fillText("- - theoretical", x1 - 180, y0 + 30);
  }, [data]);

  return (
    <div className="panel">
      <canvas ref={cv} width={880} height={360} />
      <div className="row">
        <div className="seg">
          {(Object.keys(SCHEMES) as Scheme[]).map((s) => <button key={s} className={scheme === s ? "on" : ""} onClick={() => setScheme(s)}>{s}</button>)}
        </div>
        <button className="run" onClick={run} disabled={busy}>{busy ? "Simulating…" : "↻ Re-run (60k bits/point)"}</button>
      </div>
      <p className="hint">Each point transmits <b>60,000 random bits</b> through the AWGN channel and counts errors. The simulated curve should hug the <b>theoretical</b> one — and note <b>BPSK/QPSK</b> need ~4 dB less SNR than <b>16-QAM</b> for the same BER. That's the bit-rate-vs-power tradeoff at the heart of link design.</p>
    </div>
  );
}

// ---------------- shared slider ----------------
function Slider({ label, v, min, max, step, unit, on, c, wide }: {
  label: string; v: number; min: number; max: number; step: number; unit?: string;
  on: (n: number) => void; c: string; wide?: boolean;
}) {
  return (
    <label className={"slider" + (wide ? " wide" : "")}>
      <span className="s-label"><i style={{ background: c }} />{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} style={{ accentColor: c }} onChange={(e) => on(parseFloat(e.target.value))} />
      <span className="s-val">{v}{unit ?? ""}</span>
    </label>
  );
}
