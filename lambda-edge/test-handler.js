/**
 * Test script for Lambda@Edge critical CSS injection function
 * Run with: node test-handler.js
 */

const handler = require('./inject-critical-css').handler;

// Test case 1: HTML response with <head> tag
const testHTMLResponse = () => {
  console.log('\n=== Test 1: HTML Response with <head> tag ===');
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Test Page</title>
</head>
<body>
  <h1>Test Content</h1>
</body>
</html>`;

  const event = {
    Records: [{
      cf: {
        response: {
          status: '200',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }]
          },
          body: Buffer.from(htmlContent).toString('base64'),
          bodyEncoding: 'base64'
        }
      }
    }]
  };

  handler(event, {}, (err, result) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    const body = Buffer.from(result.body, 'base64').toString('utf-8');
    console.log('Status:', result.status);
    console.log('Critical CSS Injected Header:', result.headers['x-critical-css-injected']);
    console.log('Body contains critical CSS:', body.includes('critical-css-inline'));
    console.log('Body contains .hero styles:', body.includes('.hero'));
    console.log('\nModified HTML (first 500 chars):');
    console.log(body.substring(0, 500));
  });
};

// Test case 2: Non-HTML response (should pass through unchanged)
const testNonHTMLResponse = () => {
  console.log('\n=== Test 2: Non-HTML Response (JSON) ===');
  
  const jsonContent = JSON.stringify({ message: 'API response' });

  const event = {
    Records: [{
      cf: {
        response: {
          status: '200',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'application/json' }]
          },
          body: Buffer.from(jsonContent).toString('base64'),
          bodyEncoding: 'base64'
        }
      }
    }]
  };

  handler(event, {}, (err, result) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    const body = Buffer.from(result.body, 'base64').toString('utf-8');
    console.log('Status:', result.status);
    console.log('Critical CSS Injected Header:', result.headers['x-critical-css-injected']);
    console.log('Body unchanged:', body === jsonContent);
    console.log('Body:', body);
  });
};

// Test case 3: HTML without <head> tag (edge case)
const testHTMLWithoutHead = () => {
  console.log('\n=== Test 3: HTML without <head> tag ===');
  
  const htmlContent = '<html><body><h1>No head tag</h1></body></html>';

  const event = {
    Records: [{
      cf: {
        response: {
          status: '200',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html' }]
          },
          body: Buffer.from(htmlContent).toString('base64'),
          bodyEncoding: 'base64'
        }
      }
    }]
  };

  handler(event, {}, (err, result) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    const body = Buffer.from(result.body, 'base64').toString('utf-8');
    console.log('Status:', result.status);
    console.log('Critical CSS Injected Header:', result.headers['x-critical-css-injected']);
    console.log('Body unchanged (no head tag):', body === htmlContent);
    console.log('Body:', body);
  });
};

// Run all tests
console.log('Starting Lambda@Edge Critical CSS Injection Tests...');
testHTMLResponse();

setTimeout(() => {
  testNonHTMLResponse();
}, 100);

setTimeout(() => {
  testHTMLWithoutHead();
}, 200);

setTimeout(() => {
  console.log('\n=== All Tests Complete ===\n');
}, 300);
