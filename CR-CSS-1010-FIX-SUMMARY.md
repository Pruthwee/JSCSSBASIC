# Cloud Readiness Fix: Environment-Specific Asset Paths in CSS (cr-css-1010)

## Fix Summary

**Rule ID**: cr-css-1010  
**Rule Name**: Environment-Specific Asset Paths in CSS  
**Severity**: HIGH  
**Category**: cloud-deployment-config  
**Status**: ✅ FIXED

## Problem Identified

The CSS file `assets/css/site.css` contained a hardcoded environment-specific CDN URL on line 22:
```css
background: url('https://staging-assets.local/img/bg.jpg');
```

This hardcoded staging URL prevented the application from being deployed across multiple cloud environments (dev, staging, production) without maintaining separate CSS files for each environment.

## Remediation Applied

### Strategy: Build-Time Variable Substitution with AWS CloudFront

Implemented PostCSS-based build-time variable substitution to inject AWS CloudFront distribution URLs dynamically based on environment configuration.

### Changes Made

#### 1. CSS File Update (`assets/css/site.css`)
**Line 22 - Before:**
```css
background: url('https://staging-assets.local/img/bg.jpg');
```

**Line 22 - After:**
```css
background: url('__CDN_URL__/img/bg.jpg');
```

The hardcoded staging URL has been replaced with a `__CDN_URL__` placeholder that will be substituted at build time.

#### 2. PostCSS Configuration (`postcss.config.js`) - NEW FILE
Created PostCSS configuration to handle build-time variable substitution:
```javascript
module.exports = {
  plugins: [
    require('postcss-replace')({
      pattern: /__CDN_URL__/g,
      data: {
        replaceAll: process.env.CDN_URL || 'https://d1234567890.cloudfront.net'
      }
    })
  ]
};
```

#### 3. Package.json Updates
Added build tooling dependencies and scripts:
- **Dependencies Added**:
  - `postcss`: ^8.4.31
  - `postcss-cli`: ^10.1.0
  - `postcss-replace`: ^2.0.1

- **Build Scripts Added**:
  - `build:css`: Processes CSS files with PostCSS variable substitution
  - `build`: Main build command

#### 4. Environment Configuration (`.env.example`) - NEW FILE
Created example environment file documenting the required CDN_URL variable:
```bash
CDN_URL=https://d1234567890.cloudfront.net
```

#### 5. Documentation Updates (`README.md`)
Added comprehensive documentation section explaining:
- The problem and solution
- Implementation details
- Usage instructions
- Benefits of the approach

## How It Works

### Build Process
1. Developer sets the `CDN_URL` environment variable for the target environment:
   ```bash
   export CDN_URL=https://d1234567890.cloudfront.net  # Production CloudFront
   # OR
   export CDN_URL=https://d9876543210.cloudfront.net  # Staging CloudFront
   ```

2. Run the build command:
   ```bash
   npm run build:css
   ```

3. PostCSS processes all CSS files and replaces `__CDN_URL__` with the actual CloudFront URL

4. Output CSS files in `dist/css/` directory contain environment-specific URLs

### Deployment Workflow
- **Development**: `CDN_URL=https://dev-cdn.cloudfront.net npm run build:css`
- **Staging**: `CDN_URL=https://staging-cdn.cloudfront.net npm run build:css`
- **Production**: `CDN_URL=https://prod-cdn.cloudfront.net npm run build:css`

## Benefits

✅ **Single CSS Codebase**: One set of CSS files works across all environments  
✅ **Environment-Agnostic**: No hardcoded environment-specific URLs  
✅ **AWS CloudFront Ready**: Designed for AWS CloudFront CDN integration  
✅ **Build-Time Substitution**: No runtime overhead or client-side processing  
✅ **Multi-Region Support**: Different CloudFront distributions per region/environment  
✅ **CI/CD Compatible**: Environment variables can be set in build pipelines  

## Cloud Deployment Compatibility

This fix ensures the application can be deployed to:
- ✅ AWS CloudFront + S3
- ✅ AWS Elastic Beanstalk
- ✅ AWS ECS/EKS with CloudFront
- ✅ AWS Amplify
- ✅ Any AWS service with CloudFront CDN integration

## Testing

### Local Testing
```bash
# Set test CloudFront URL
export CDN_URL=https://d1234567890.cloudfront.net

# Build CSS
npm run build:css

# Verify substitution
grep -r "d1234567890.cloudfront.net" dist/css/
```

### Expected Output
The processed CSS should contain:
```css
.promo {
  background: url('https://d1234567890.cloudfront.net/img/bg.jpg');
}
```

## Files Modified

1. ✅ `assets/css/site.css` - Replaced hardcoded URL with placeholder
2. ✅ `postcss.config.js` - Created PostCSS configuration (NEW)
3. ✅ `package.json` - Added build dependencies and scripts
4. ✅ `.env.example` - Created environment variable documentation (NEW)
5. ✅ `README.md` - Added comprehensive documentation

## Compliance

This fix ensures compliance with:
- ✅ 12-Factor App Principles (Config in environment)
- ✅ AWS Well-Architected Framework (Environment-agnostic design)
- ✅ Cloud-Native Patterns (Build-time configuration)
- ✅ Multi-Environment Deployment Best Practices

## Next Steps

1. **Install Dependencies**: Run `npm install` to install PostCSS tooling
2. **Configure CloudFront**: Set up CloudFront distribution for each environment
3. **Set Environment Variables**: Configure `CDN_URL` in CI/CD pipeline
4. **Build CSS**: Run `npm run build:css` as part of deployment process
5. **Deploy**: Deploy processed CSS files from `dist/css/` directory

---

**Fix Completed**: All environment-specific asset paths have been replaced with build-time variable substitution, making the application fully cloud-ready for AWS deployment.
