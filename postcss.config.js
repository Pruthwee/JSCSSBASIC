// PostCSS configuration for build-time variable substitution and CSS optimization
// Replaces __CDN_URL__ placeholder with CloudFront distribution URL from environment variable
// Integrates PurgeCSS plugin to remove unused CSS rules during build
// Processes bundled CSS file for AWS S3 + CloudFront delivery with HTTP/2

const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    require('postcss-replace')({
      pattern: /__CDN_URL__/g,
      data: {
        replaceAll: process.env.CDN_URL || 'https://d1234567890.cloudfront.net'
      }
    }),
    // PurgeCSS plugin - only run in production
    ...(process.env.NODE_ENV === 'production' ? [
      purgecss({
        content: [
          './index.html',
          './src/**/*.{js,jsx,ts,tsx}',
          './assets/js/**/*.js',
          './lambda-edge/**/*.js'
        ],
        safelist: {
          standard: [/^animate__/, /^hero$/, /^promo$/, /^user-card$/],
          deep: [/^data-/, /^aria-/],
          greedy: [/:hover$/, /:focus$/, /:active$/, /::before$/, /::after$/]
        },
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        fontFace: true,
        keyframes: true,
        variables: true
      })
    ] : [])
  ]
};
