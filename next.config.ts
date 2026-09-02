import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Ancora a raiz do workspace neste diretório: sem isso, o Turbopack
  // detecta um package-lock.json em uma pasta acima do repositório Git
  // (fora do projeto) e emite um aviso de root ambíguo a cada build.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
