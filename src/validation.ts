import { STATUSES, type NewBook, type Status } from "./types";

export type ValidationResult =
  | { ok: true; value: NewBook }
  | { ok: false; error: string };

/**
 * Checks a request body for POST and PUT and builds a clean `NewBook` from it.
 * Only the known fields are copied, so a client cannot set the `id` or anything else.
 */
export function validateBookInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const { title, author, status, rating, notes } = body as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || title.trim() === "") {
    return { ok: false, error: "title must be a non-empty text" };
  }

  if (typeof author !== "string" || author.trim() === "") {
    return { ok: false, error: "author must be a non-empty text" };
  }

  if (status !== undefined && !isStatus(status)) {
    return {
      ok: false,
      error: `status must be one of: ${STATUSES.join(", ")}`,
    };
  }

  if (rating !== undefined && rating !== null && !isRating(rating)) {
    return { ok: false, error: "rating must be null or an integer from 1 to 5" };
  }

  if (notes !== undefined && typeof notes !== "string") {
    return { ok: false, error: "notes must be a text" };
  }

  return {
    ok: true,
    value: {
      title: title.trim(),
      author: author.trim(),
      status: status ?? "want-to-read",
      rating: rating ?? null,
      notes: notes ?? "",
    },
  };
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && STATUSES.includes(value as Status);
}

function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}
