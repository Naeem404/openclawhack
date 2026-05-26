/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@herd/shared"],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
