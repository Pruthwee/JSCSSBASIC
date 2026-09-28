# AWS CloudFront + S3 Configuration for Bundled CSS Assets

## Overview
This configuration enables optimal CSS delivery via AWS CloudFront with HTTP/2 support,
eliminating the excessive HTTP request overhead from loading multiple separate CSS files.

## Architecture
- **Origin**: AWS S3 bucket hosting bundled CSS assets
- **CDN**: AWS CloudFront distribution with HTTP/2 enabled
- **Build Pipeline**: PostCSS + PurgeCSS for optimization

## Build Process

### 1. Bundle CSS Files
```bash
npm run build:css:bundle
```
This consolidates all CSS chunks, deferred styles, site styles, and brand styles into a single `bundle.css` file.

### 2. Process and Optimize
```bash
npm run build:css
```
This runs PostCSS to:
- Replace `__CDN_URL__` placeholders with CloudFront distribution URL
- Apply PurgeCSS to remove unused CSS rules
- Minify and optimize the bundled CSS

### 3. Deploy to S3
```bash
npm run deploy:s3
```
Uploads the optimized CSS bundle to S3 with:
- Cache-Control: max-age=31536000 (1 year)
- Proper content-type headers

## CloudFront Configuration

### Required Settings
1. **HTTP/2 Enabled**: Ensure HTTP/2 is enabled in CloudFront distribution settings
2. **Compression**: Enable automatic compression (gzip/brotli)
3. **Cache Behavior**:
   - Path pattern: `/css/*`
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS
   - Cache Based on Selected Request Headers: None
   - Object Caching: Use Origin Cache Headers
   - Forward Cookies: None
   - Query String Forwarding: None
   - Compress Objects Automatically: Yes

### Environment Variables
Set these in your deployment environment:
- `CDN_URL`: CloudFront distribution URL (e.g., https://d1234567890.cloudfront.net)
- `S3_BUCKET`: S3 bucket name for CSS assets (e.g., my-app-assets)
- `NODE_ENV`: Set to 'production' for PurgeCSS optimization

## Performance Benefits
- **Reduced HTTP Requests**: 13 separate CSS files → 1 bundled file
- **HTTP/2 Multiplexing**: Single connection for all assets
- **Edge Caching**: CloudFront edge locations cache the bundle globally
- **Compression**: Automatic gzip/brotli compression reduces transfer size
- **Long-term Caching**: 1-year cache headers reduce repeat requests

## Deployment Checklist
- [ ] Build CSS bundle: `npm run build`
- [ ] Deploy to S3: `npm run deploy:s3`
- [ ] Verify CloudFront distribution has HTTP/2 enabled
- [ ] Test CSS loading from CloudFront URL
- [ ] Verify cache headers are set correctly
- [ ] Monitor CloudFront metrics for cache hit ratio

## Monitoring
Monitor these CloudFront metrics:
- Cache Hit Rate (target: >90%)
- Origin Latency (should be minimal with edge caching)
- 4xx/5xx Error Rate (should be near 0%)
- Data Transfer (should decrease with compression)
