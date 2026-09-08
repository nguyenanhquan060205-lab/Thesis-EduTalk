import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.107.1",
    "192.168.1.240",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
