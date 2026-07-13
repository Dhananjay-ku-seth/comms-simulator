import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Communication Systems Simulator — modulation, constellation, BER (portfolio demo)
export default defineConfig({
  server: { host: "::", port: 5184 },
  plugins: [react()],
});
