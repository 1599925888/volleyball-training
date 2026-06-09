// Health check endpoint - verifies Netlify Functions are deployed
export default async function handler() {
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ok',
      time: new Date().toISOString(),
      message: 'Netlify Functions are deployed and running.',
      endpoints: {
        health: '/.netlify/functions/health',
        generatePlan: '/.netlify/functions/generate-plan',
        generateReport: '/.netlify/functions/generate-report',
      }
    }),
  };
}
