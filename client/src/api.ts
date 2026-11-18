import type { Book, NewBook, StatusFilter } from "./types";

export const API_URL = "http://localhost:3001/api";

/** All `fetch` calls of the app live here. Every function throws an `Error` with a message to show. */
async function send(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach the server at ${API_URL}. Is the API running?`);
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response;
}

/** The `error` of the API, or a generic text when the body is not `{ "error": "<message>" }`. */
async function readError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // The body is not JSON.
  }
  return `Request failed (${response.status})`;
}

function jsonBody(method: string, data: NewBook): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export async function listBooks(status: StatusFilter = "all"): Promise<Book[]> {
  const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const response = await send(`/books${query}`);
  return (await response.json()) as Book[];
}

export async function createBook(data: NewBook): Promise<Book> {
  const response = await send("/books", jsonBody("POST", data));
  return (await response.json()) as Book;
}

/** `PUT` replaces the whole book, so `data` must have every editable field. */
export async function replaceBook(id: string, data: NewBook): Promise<Book> {
  const response = await send(
    `/books/${encodeURIComponent(id)}`,
    jsonBody("PUT", data)
  );
  return (await response.json()) as Book;
}

export async function deleteBook(id: string): Promise<void> {
  await send(`/books/${encodeURIComponent(id)}`, { method: "DELETE" });
}
