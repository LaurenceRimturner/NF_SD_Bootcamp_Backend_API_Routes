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

export const SORT_FIELDS = ["title"] as const;
export const MAX_LIMIT = 100;

export type ListOptions = {
  sort?: (typeof SORT_FIELDS)[number];
  limit?: number;
  offset: number;
};

export type ListOptionsResult =
  | { ok: true; value: ListOptions }
  | { ok: false; error: string };

/** Checks `sort`, `limit` and `offset` of `GET /api/books`. All three are optional. */
export function validateListOptions(query: {
  sort?: unknown;
  limit?: unknown;
  offset?: unknown;
}): ListOptionsResult {
  const { sort, limit, offset } = query;

  if (sort !== undefined && !isSortField(sort)) {
    return { ok: false, error: `sort must be one of: ${SORT_FIELDS.join(", ")}` };
  }

  const parsedLimit = limit === undefined ? undefined : toWholeNumber(limit);
  if (parsedLimit === null || (parsedLimit !== undefined && (parsedLimit < 1 || parsedLimit > MAX_LIMIT))) {
    return { ok: false, error: `limit must be a whole number from 1 to ${MAX_LIMIT}` };
  }

  const parsedOffset = offset === undefined ? 0 : toWholeNumber(offset);
  if (parsedOffset === null) {
    return { ok: false, error: "offset must be a whole number from 0" };
  }

  return { ok: true, value: { sort, limit: parsedLimit, offset: parsedOffset } };
}

function isSortField(value: unknown): value is (typeof SORT_FIELDS)[number] {
  return typeof value === "string" && SORT_FIELDS.includes(value as "title");
}

/** `"12"` gives 12. Anything that is not plain digits (`"abc"`, `"-1"`, `"1.5"`, a list) gives `null`. */
function toWholeNumber(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,9}$/.test(value)) {
    return null;
  }
  return Number(value);
}
