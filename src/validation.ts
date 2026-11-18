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

  const error =
    titleError(title) ??
    authorError(author) ??
    (status === undefined ? undefined : statusError(status)) ??
    (rating === undefined ? undefined : ratingError(rating)) ??
    (notes === undefined ? undefined : notesError(notes));
  if (error !== undefined) {
    return { ok: false, error };
  }

  return {
    ok: true,
    value: {
      title: (title as string).trim(),
      author: (author as string).trim(),
      status: (status as Status | undefined) ?? "want-to-read",
      rating: (rating as number | null | undefined) ?? null,
      notes: (notes as string | undefined) ?? "",
    },
  };
}

export type PatchResult =
  | { ok: true; value: Partial<NewBook> }
  | { ok: false; error: string };

/**
 * Checks a request body for PATCH. Only the fields that are present are checked and
 * copied, with the same rules as `validateBookInput`. At least one field is required.
 */
export function validateBookPatch(body: unknown): PatchResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const { title, author, status, rating, notes } = body as Record<
    string,
    unknown
  >;
  const value: Partial<NewBook> = {};

  if (title !== undefined) {
    const error = titleError(title);
    if (error !== undefined) return { ok: false, error };
    value.title = (title as string).trim();
  }
  if (author !== undefined) {
    const error = authorError(author);
    if (error !== undefined) return { ok: false, error };
    value.author = (author as string).trim();
  }
  if (status !== undefined) {
    const error = statusError(status);
    if (error !== undefined) return { ok: false, error };
    value.status = status as Status;
  }
  if (rating !== undefined) {
    const error = ratingError(rating);
    if (error !== undefined) return { ok: false, error };
    value.rating = rating as number | null;
  }
  if (notes !== undefined) {
    const error = notesError(notes);
    if (error !== undefined) return { ok: false, error };
    value.notes = notes as string;
  }

  if (Object.keys(value).length === 0) {
    return {
      ok: false,
      error: "Body must contain at least one of: title, author, status, rating, notes",
    };
  }

  return { ok: true, value };
}

// One rule per field, shared by POST, PUT and PATCH. They return the message or `undefined`.
function titleError(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? undefined
    : "title must be a non-empty text";
}

function authorError(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? undefined
    : "author must be a non-empty text";
}

function statusError(value: unknown): string | undefined {
  return isStatus(value)
    ? undefined
    : `status must be one of: ${STATUSES.join(", ")}`;
}

function ratingError(value: unknown): string | undefined {
  return value === null || isRating(value)
    ? undefined
    : "rating must be null or an integer from 1 to 5";
}

function notesError(value: unknown): string | undefined {
  return typeof value === "string" ? undefined : "notes must be a text";
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
