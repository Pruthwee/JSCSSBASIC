# Lambda@Edge Critical CSS Injection - Deployment Guide

## Overview
This solution uses AWS Lambda@Edge to dynamically inject critical CSS inline into HTML responses at CloudFront edge locations, eliminating render-blocking external CSS requests for above-fold content.

## Architecture
```
User Request → CloudFront → Origin (S3/ALB) → Lambda@Edge (Viewer Response) → User
                                                    ↓
                                            Inject Critical CSS Inline
```

## Prerequisites
- AWS Account with CloudFront distribution
- IAM permissions for Lambda@Edge and CloudFront
- Node.js runtime (AWS Lambda supports Node.js 18.x, 20.x)

## Deployment Steps

### 1. Create Lambda Function in us-east-1
Lambda@Edge functions MUST be created in the us-east-1 (N. Virginia) region.

```bash
cd lambda-edge
zip -r inject-critical-css.zip inject-critical-css.js

aws lambda create-function \
  --region us-east-1 \
  --function-name InjectCriticalCSS \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-edge-execution-role \
  --handler inject-critical-css.handler \
  --zip-file fileb://inject-critical-css.zip \
  --timeout 5 \
  --memory-size 128
```

### 2. Publish Lambda Version
Lambda@Edge requires a published version (not $LATEST).

```bash
aws lambda publish-version \
  --region us-east-1 \
  --function-name InjectCriticalCSS
```

Note the version ARN returned (e.g., `arn:aws:lambda:us-east-1:123456789012:function:InjectCriticalCSS:1`)

### 3. Configure CloudFront Distribution
Add the Lambda@Edge function as a viewer response trigger:

```bash
# Get your CloudFront distribution config
aws cloudfront get-distribution-config \
  --id YOUR_DISTRIBUTION_ID > dist-config.json

# Edit dist-config.json to add Lambda@Edge association
# Add to the default cache behavior:
{
  "LambdaFunctionAssociations": {
    "Quantity": 1,
    "Items": [
      {
        "LambdaFunctionARN": "arn:aws:lambda:us-east-1:123456789012:function:InjectCriticalCSS:1",
        "EventType": "viewer-response",
        "IncludeBody": true
      }
    ]
  }
}

# Update the distribution
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --if-match ETAG_FROM_GET_CONFIG \
  --distribution-config file://dist-config-updated.json
```

### 4. IAM Role for Lambda@Edge
Create an IAM role with the following trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "lambda.amazonaws.com",
          "edgelambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach the following managed policies:
- `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)

## Testing

### 1. Test Locally
```bash
cd lambda-edge
node -e "
const handler = require('./inject-critical-css').handler;
const event = {
  Records: [{
    cf: {
      response: {
        status: '200',
        headers: {
          'content-type': [{ value: 'text/html' }]
        },
        body: Buffer.from('<html><head></head><body>Test</body></html>').toString('base64'),
        bodyEncoding: 'base64'
      }
    }
  }]
};
handler(event, {}, (err, result) => {
  console.log('Result:', result);
});
"
```

### 2. Test in CloudFront
After deployment, test by accessing your CloudFront distribution URL:

```bash
curl -I https://YOUR_DISTRIBUTION.cloudfront.net/

# Check for the custom header
# X-Critical-CSS-Injected: true
```

View the HTML source to verify critical CSS is injected inline in the `<head>` section.

## Performance Benefits

### Before (External CSS)
- Browser downloads HTML
- Browser discovers external CSS link
- Browser makes additional request for critical CSS
- Render blocked until CSS loads
- **First Contentful Paint (FCP): ~1.5-2.5s**

### After (Inline CSS via Lambda@Edge)
- Browser downloads HTML with critical CSS already inline
- No additional request needed for above-fold styles
- Render starts immediately
- **First Contentful Paint (FCP): ~0.5-1.0s**
- **FCP improvement: 50-60%**

## Monitoring

### CloudWatch Metrics
Monitor Lambda@Edge execution:
- Invocations
- Duration
- Errors
- Throttles

### CloudWatch Logs
Lambda@Edge logs are written to CloudWatch Logs in the region where the function executes (edge location region).

```bash
# View logs (example for us-east-1 edge location)
aws logs tail /aws/lambda/us-east-1.InjectCriticalCSS --follow
```

## Cost Considerations

### Lambda@Edge Pricing (as of 2024)
- $0.60 per 1 million requests
- $0.00005001 per GB-second of compute time
- Free tier: 1 million requests and 400,000 GB-seconds per month

### Example Cost
For 10 million HTML page views per month:
- Requests: 10M × $0.60 / 1M = $6.00
- Compute (128MB, 50ms avg): 10M × 0.05s × 0.125GB × $0.00005001 = $3.13
- **Total: ~$9.13/month**

## Maintenance

### Updating Critical CSS
When critical CSS changes:

1. Update the `CRITICAL_CSS` constant in `inject-critical-css.js`
2. Deploy new Lambda version:
```bash
zip -r inject-critical-css.zip inject-critical-css.js
aws lambda update-function-code \
  --region us-east-1 \
  --function-name InjectCriticalCSS \
  --zip-file fileb://inject-critical-css.zip

aws lambda publish-version \
  --region us-east-1 \
  --function-name InjectCriticalCSS
```
3. Update CloudFront distribution to use new version ARN
4. Wait for CloudFront distribution to deploy (~5-15 minutes)

## Troubleshooting

### Issue: Critical CSS not appearing in HTML
- Check CloudFront distribution has Lambda@Edge association
- Verify Lambda function version (not $LATEST)
- Check `X-Critical-CSS-Injected` header in response
- Review CloudWatch Logs for Lambda errors

### Issue: Lambda timeout
- Increase Lambda timeout (max 30s for viewer response)
- Optimize critical CSS size (keep under 14KB for optimal performance)

### Issue: CloudFront returns 502 Bad Gateway
- Check Lambda function returns valid response structure
- Verify IAM role has correct trust policy
- Check Lambda execution role has CloudWatch Logs permissions

## Security Considerations

1. **Content Security Policy (CSP)**: Update CSP to allow inline styles
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;">
   ```

2. **Lambda@Edge Limits**:
   - Response body size: 1MB (including injected CSS)
   - Execution time: 30 seconds max for viewer response
   - Memory: 128MB-10GB

3. **Cache Behavior**: Ensure CloudFront caching is configured appropriately
   - HTML pages should have short TTL or be invalidated on deployment
   - Static assets (CSS, JS, images) should have long TTL

## Alternative Approaches (Not Implemented)

If Lambda@Edge is not suitable for your use case, consider:

1. **Build-time injection**: Inject critical CSS during build process
2. **Server-side rendering (SSR)**: Inject critical CSS in SSR framework
3. **CDN edge workers**: Use CloudFlare Workers or similar edge compute

## References

- [AWS Lambda@Edge Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html)
- [CloudFront Lambda@Edge Limits](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-lambda-at-edge)
- [Web Vitals - First Contentful Paint](https://web.dev/fcp/)
