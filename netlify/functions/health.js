exports.handler = async function() {
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ok',
      time: new Date().toISOString(),
      message: 'Functions are deployed!',
    }),
  };
};
