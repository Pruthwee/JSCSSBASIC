/**
 * Lambda@Edge function to inject critical CSS inline into HTML responses
 * This function runs at CloudFront edge locations to optimize First Contentful Paint
 * by eliminating render-blocking external CSS requests for above-fold content.
 * 
 * Deploy this function to CloudFront as a viewer response trigger.
 */

// Critical above-fold CSS extracted from multiple sources including client-hydration.css
const CRITICAL_CSS = `
:root {
  --primary-color: #0a2540;
}

.hero {
  color: var(--primary-color);
  /* CLOUD FIX: Relative path for Webpack asset processing - will be transformed to S3/CloudFront URL at build time */
  background: url('../img/header.svg');
}

.promo {
  background: url('https://staging-assets.local/img/bg.jpg');
}

.user-card::before {
  content: attr(data-user);
}

@font-face {
  font-family: 'BrandSans';
  src: url('../fonts/analytics.woff2') format('woff2');
}

/* Critical styles from client-hydration.css - prevents FOUC during SSR */
.hydrated-widget {
  opacity: 1;
  transition: opacity 0.3s;
  background: url('https://cdn.example.net/client-only-bg.png');
}

.ssr-hidden {
  display: block;
  color: var(--hydrated-color);
}

/* End of critical CSS extraction from client-hydration.css */
`;

/**
 * Lambda@Edge handler for viewer response events
 * @param {Object} event - CloudFront viewer response event
 * @param {Object} context - Lambda execution context
 * @param {Function} callback - Callback function
 */
exports.handler = async (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  
  // Only process HTML responses
  const contentType = headers['content-type'] && headers['content-type'][0].value;
  if (!contentType || !contentType.includes('text/html')) {
    callback(null, response);
    return;
  }
  
  // Get the response body
  let body = response.body;
  
  // Check if body is base64 encoded
  if (response.bodyEncoding === 'base64') {
    body = Buffer.from(body, 'base64').toString('utf-8');
  }
  
  // Inject critical CSS inline into the <head> section
  // This eliminates the render-blocking external CSS request
  const criticalStyleTag = `<style id="critical-css-inline">
/* Critical above-fold CSS injected by Lambda@Edge */
${CRITICAL_CSS}
</style>`;
  
  // Find the closing </head> tag and inject critical CSS before it
  if (body.includes('</head>')) {
    body = body.replace('</head>', `${criticalStyleTag}\n</head>`);
    
    // Update response body
    response.body = Buffer.from(body, 'utf-8').toString('base64');
    response.bodyEncoding = 'base64';
    
    // Add header to indicate critical CSS was injected
    response.headers['x-critical-css-injected'] = [{
      key: 'X-Critical-CSS-Injected',
      value: 'true'
    }];
  }
  
  callback(null, response);
};
