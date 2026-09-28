// PurgeCSS configuration for removing unused CSS rules
// Integrated into AWS CodeBuild pipeline to optimize bundle size for CloudFront delivery

module.exports = {
  // Content files to scan for used CSS selectors
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './assets/js/**/*.js',
    './lambda-edge/**/*.js'
  ],
  
  // CSS files to process
  css: [
    './dist/css/**/*.css'
  ],
  
  // Safelist patterns - selectors to always keep
  safelist: {
    // Keep animation classes from animate.css
    standard: [/^animate__/, /^hero$/, /^promo$/, /^user-card$/],
    // Keep classes added dynamically
    deep: [/^data-/, /^aria-/],
    // Keep pseudo-classes and pseudo-elements
    greedy: [/:hover$/, /:focus$/, /:active$/, /::before$/, /::after$/]
  },
  
  // Additional options
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
  
  // Keep font-face rules
  fontFace: true,
  
  // Keep keyframes
  keyframes: true,
  
  // Keep CSS variables
  variables: true,
  
  // Reject rules - patterns to always remove
  rejected: true,
  rejectedCss: './dist/css/rejected.css'
};
