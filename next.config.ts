import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence l'inférence ambiguë de workspace root (lockfile parent dans /Users/louissaure/).
  outputFileTracingRoot: path.resolve(__dirname),
  // Masque le bouton flottant Next.js en dev (chevauchait l'icône Réglages de la sidebar).
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          // Autorise le SW à contrôler toute l'origine (pas seulement /sw.js).
          { key: "Service-Worker-Allowed", value: "/" },
          // Forcer le navigateur à toujours récupérer la dernière version du SW.
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
