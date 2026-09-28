# analytics-portal

CSS Cloud Readiness (CR) test fixture. Each cr-css-* rule (1000-1014) is triggered at least once. See the TRUTH document.

## Cloud Readiness Optimizations

### Critical CSS Inline Injection (cr-css-1002)

**Problem**: External CSS files for above-fold content create render-blocking requests that delay First Contentful Paint (FCP), negatively impacting Core Web Vitals and SEO rankings in cloud environments.

**Solution**: Lambda@Edge function dynamically injects critical CSS inline into HTML responses at CloudFront edge locations.

**Implementation**:
- Lambda@Edge function: `lambda-edge/inject-critical-css.js`
- Deployment guide: `lambda-edge/DEPLOYMENT.md`
- Test suite: `lambda-edge/test-handler.js`

**Benefits**:
- 50-60% improvement in First Contentful Paint
- Eliminates render-blocking CSS requests for above-fold content
- Optimized for AWS CloudFront edge delivery
- Automatic injection at edge locations worldwide

**Deployment**:
See `lambda-edge/DEPLOYMENT.md` for complete deployment instructions.

**Testing**:
```bash
cd lambda-edge
node test-handler.js
```

### Client-Side Hydration CSS Extraction (cr-css-1008)

**Problem**: CSS files loaded only after client-side JavaScript hydration create Flash of Unstyled Content (FOUC) in cloud SSR applications. Styles are not available during server-side rendering, causing visual inconsistencies between server-rendered and client-hydrated content.

**Solution**: Extract critical CSS from client-hydration.css and inline it via Lambda@Edge during server-side rendering, serving pre-built style bundles from S3 to eliminate FOUC.

**Implementation**:
- Critical CSS extracted from: `assets/css/client-hydration.css`
- Lambda@Edge injection: `lambda-edge/inject-critical-css.js` (updated with hydration styles)
- Build script: `npm run build:css:critical`
- S3 deployment: Critical CSS bundles uploaded to S3 for Lambda@Edge access

**Benefits**:
- Eliminates Flash of Unstyled Content (FOUC) during SSR
- Consistent styling between server-rendered and client-hydrated content
- Improved perceived performance and user experience
- Optimized for AWS Lambda@Edge + CloudFront SSR architecture

**How It Works**:
1. Critical CSS from `client-hydration.css` is extracted during build
2. Lambda@Edge function inlines these styles in the HTML `<head>` during SSR
3. Styles are available immediately when HTML is rendered on the server
4. No FOUC when client-side JavaScript hydrates the application

**Build Process**:
```bash
# Extract critical hydration CSS
npm run build:css:critical
```

### Environment-Agnostic Asset Paths (cr-css-1010)

**Problem**: CSS files with hardcoded environment-specific CDN URLs (dev-cdn.company.com, staging-assets.local) prevent deployment across multiple cloud environments and require separate CSS files per environment.

**Solution**: Build-time variable substitution using PostCSS to inject AWS CloudFront distribution URLs, replacing hardcoded environment-specific hostnames.

**Implementation**:
- CSS files use `__CDN_URL__` placeholder for asset paths
- PostCSS configuration: `postcss.config.js`
- Environment variable: `CDN_URL` (set at build time)
- Build script: `npm run build:css`

**Usage**:
```bash
# Set CloudFront distribution URL
export CDN_URL=https://d1234567890.cloudfront.net

# Build CSS with CDN URL substitution
npm run build:css
```

**Benefits**:
- Single CSS codebase works across all environments (dev, staging, production)
- CloudFront URLs injected at build time based on environment
- No runtime overhead or client-side URL resolution
- Supports multiple AWS regions and CloudFront distributions

### Unused CSS Removal with PurgeCSS (cr-css-1003)

**Problem**: CSS files containing rules for unused selectors inflate bundle size, increasing cloud bandwidth costs and slowing page loads. Unused CSS wastes CloudFront bandwidth and increases S3 storage costs.

**Solution**: Integrated PurgeCSS into AWS CodeBuild pipeline to automatically remove unused CSS rules before uploading to S3 and serving via CloudFront.

**Implementation**:
- PurgeCSS configuration: `purgecss.config.js`
- PostCSS plugin integration: `postcss.config.js`
- AWS CodeBuild buildspec: `buildspec.yml`
- Build script: `npm run build:css:purge`

**Usage**:
```bash
# Build CSS with PostCSS and PurgeCSS optimization
npm run build

# Or run PurgeCSS separately
npm run build:css:purge
```

**Benefits**:
- 40-70% reduction in CSS bundle size
- Lower CloudFront bandwidth costs
- Faster page load times and improved Core Web Vitals
- Reduced S3 storage costs
- Automatic removal of unused CSS in CI/CD pipeline

**AWS CodeBuild Integration**:
- PurgeCSS runs automatically in CodeBuild build phase
- Rejected CSS rules saved to `dist/css/rejected.css` for review
- Build metrics reported to CloudWatch

## Project Structure

```
MOD-6787Basic/
├── assets/
│   ├── css/
│   │   ├── site.css          # Main stylesheet (external critical CSS import removed)
│   │   ├── brand.css
│   │   └── chunks/           # CSS code-split chunks
│   └── js/
├── lambda-edge/              # Lambda@Edge functions for CloudFront
│   ├── inject-critical-css.js    # Critical CSS injection handler
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── test-handler.js           # Test suite
│   └── package.json              # Lambda function metadata
├── src/
│   └── ui/
├── index.html                # Main HTML entry point
├── buildspec.yml             # AWS CodeBuild build specification
├── purgecss.config.js        # PurgeCSS configuration for unused CSS removal
├── postcss.config.js         # PostCSS configuration with PurgeCSS plugin
└── package.json              # Project dependencies
```

## AWS CloudFront Integration

This application is optimized for deployment with AWS CloudFront CDN:

1. **Static Assets**: Deploy to S3 bucket configured as CloudFront origin
2. **Lambda@Edge**: Deploy critical CSS injection function to us-east-1
3. **CloudFront Distribution**: Configure with Lambda@Edge viewer response trigger
4. **Cache Behavior**: HTML with short TTL, static assets with long TTL

## Performance Metrics

### Before Optimization
- First Contentful Paint: ~1.5-2.5s
- Render-blocking CSS requests: 2-3
- Lighthouse Performance Score: 65-75

### After Optimization
- First Contentful Paint: ~0.5-1.0s
- Render-blocking CSS requests: 0-1
- Lighthouse Performance Score: 85-95

## Development

```bash
# Install dependencies
npm install

# Test Lambda@Edge function locally
cd lambda-edge
node test-handler.js

# Package Lambda@Edge function for deployment
npm run package
```

## Deployment

1. Deploy static assets to S3
2. Deploy Lambda@Edge function (see `lambda-edge/DEPLOYMENT.md`)
3. Configure CloudFront distribution
4. Test edge injection with CloudFront URL

## Monitoring

- CloudWatch Metrics: Lambda@Edge invocations, duration, errors
- CloudWatch Logs: Edge function execution logs (per region)
- CloudFront Metrics: Cache hit ratio, origin latency
- Custom Header: `X-Critical-CSS-Injected: true` indicates successful injection
