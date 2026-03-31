/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export disabled for local dev - re-enable before Firebase Hosting deploy
  // output: 'export',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
