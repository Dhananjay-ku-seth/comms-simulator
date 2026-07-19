# Comms Simulator

A **communication systems** playground: analog AM/FM modulation, digital constellation diagrams over an AWGN
channel, and **Monte-Carlo BER-vs-SNR** curves benchmarked against theory.

Part of the [LabBench](https://labbench-hub.vercel.app/) suite of interactive engineering tools.

**Live demo:** https://comms-simulator-pi.vercel.app/

## Features
- **Analog** — AM & FM in the time domain, with the AM envelope and over-modulation shown live
- **Constellation** — BPSK / QPSK / 16-QAM ideal points + received AWGN scatter, live symbol-error rate
- **BER Curve** — Monte-Carlo (60k bits/point) vs the theoretical Q-function on a semilog plot
- Unit-energy symbols, Gray-coded PAM-4, Box–Muller AWGN, `Q(x)=½·erfc(x/√2)`

## LabBench Pro
Sign in to save and reload a full session (Analog/Constellation/BER settings together) — part of the same
optional ₹29/mo LabBench Pro subscription as the rest of the suite. Upgrade from
[Logic Circuit Simulator](https://logic-circuit-sim.vercel.app/), which hosts the checkout for all 5 tools.

## Tech
React + TypeScript + Vite. All DSP/communication math implemented from scratch — no libraries.
Auth/save-load via Supabase (Postgres + RLS).

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — ECE portfolio._
