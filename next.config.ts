/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {}, // true, // Active les Server Actions pour App Router
  },
  webpack: (config: { resolve: { alias: any } }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-server-dom-webpack/server.edge":
        "react-server-dom-webpack/server.node",
    };
    return config;
  },
};

module.exports = nextConfig;
