/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**', // Allow any hostname for images. Be cautious with this in production for security.
                                // It's better to list specific domains if you know them:
                                // hostname: 'arweave.net',
                                // hostname: 'nftstorage.link',
                                // hostname: 'img.solana.com',
                                // etc.
            },
        ],
    },
};

export default nextConfig;
