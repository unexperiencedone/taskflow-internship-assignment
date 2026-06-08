export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function errorResponse(message, status = 500, details = null) {
  return jsonResponse(
    {
      success: false,
      error: {
        message,
        ...(details ? { details } : {})
      }
    },
    status
  );
}

export function successResponse(message, data = null, status = 200) {
  return jsonResponse(
    {
      success: true,
      message,
      ...(data ? { data } : {})
    },
    status
  );
}
