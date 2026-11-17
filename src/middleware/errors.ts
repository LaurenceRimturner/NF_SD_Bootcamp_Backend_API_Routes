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

  // The details stay in the server log, the client only gets a generic message.
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};

/** `express.json()` fails with this type when the body is not valid JSON. */
function isJsonParseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}
