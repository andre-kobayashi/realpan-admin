/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['admin.realpan.jp', 'api.realpan.jp'],
  },

  // Fix para @imgly/background-removal (usa ESM/WASM incompatível com Terser)
  transpilePackages: ['@imgly/background-removal'],

  webpack: (config, { isServer }) => {
    // Ignorar arquivos .node binários do onnxruntime
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
    };

    // Não tentar fazer bundle dos arquivos .node no client
    config.module.rules.push({
      test: /\.node$/,
      use: 'null-loader',
    });

    // Evitar que o webpack tente processar os workers WASM como módulos normais
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
    };

    if (!isServer) {
      // No browser, ignorar módulos Node.js usados internamente pela lib
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
        'node:fs/promises': false,
        'node:fs': false,
        'node:os': false,
        'node:path': false,
        'node:crypto': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;