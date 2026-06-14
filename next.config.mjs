/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth', 'jszip', 'xlsx', 'pptxgenjs'],
};

export default nextConfig;
