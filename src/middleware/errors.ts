import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: "Not found" });
};

// Express knows an error handler by its four parameters, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isJsonParseError(error)) {
    response.status(400).json({ error: "Body must be valid JSON" });
    return;
  }

  // Body parser and Express mark client mistakes (too large, bad URL) with a 4xx status.
  const status = clientErrorStatus(error);
  if (status !== undefined) {
    response.status(status).json({ error: CLIENT_ERRORS[status] ?? "Bad request" });
    return;
  }

  // The details stay in the server log, the client only gets a generic message.
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};

const CLIENT_ERRORS: Record<number, string> = {
  400: "Bad request",
  413: "Request body too large",
  415: "Unsupported content type",
};

/** The 4xx status of an error from the body parser or Express, or `undefined`. */
function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  const { status } = error;
  return typeof status === "number" && status >= 400 && status < 500
    ? status
    : undefined;
}

/** `express.json()` fails with this type when the body is not valid JSON. */
function isJsonParseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}
