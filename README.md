# Comms Simulator

A **communication systems** playground: analog AM/FM modulation, digital constellation diagrams over an AWGN
channel, and **Monte-Carlo BER-vs-SNR** curves benchmarked against theory.

**Live demo:** _add your Vercel URL here_

## Features
- **Analog** — AM & FM in the time domain, with the AM envelope and over-modulation shown live
- **Constellation** — BPSK / QPSK / 16-QAM ideal points + received AWGN scatter, live symbol-error rate
- **BER Curve** — Monte-Carlo (60k bits/point) vs the theoretical Q-function on a semilog plot
- Unit-energy symbols, Gray-coded PAM-4, Box–Muller AWGN, `Q(x)=½·erfc(x/√2)`

## Tech
React + TypeScript + Vite. All DSP/communication math implemented from scratch — no libraries.

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — ECE portfolio._
