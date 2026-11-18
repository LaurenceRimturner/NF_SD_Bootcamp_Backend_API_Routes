import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { API_URL, createBook, deleteBook, listBooks, replaceBook } from "./api";
import type { Book, NewBook } from "./types";

const book: Book = {
  id: "b1",
  title: "Dune",
  author: "Frank Herbert",
  status: "done",
  rating: 5,
  notes: "",
};
const { id: _id, ...newBook }: Book = book;

const fetchMock = vi.fn<typeof fetch>();

function reply(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("listBooks", () => {
  test("loads all books without a query", async () => {
    fetchMock.mockResolvedValue(reply(200, [book]));
    await expect(listBooks()).resolves.toEqual([book]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books`, undefined);
  });

  test("sends the status filter", async () => {
    fetchMock.mockResolvedValue(reply(200, []));
    await listBooks("want-to-read");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/books?status=want-to-read`,
      undefined
    );
  });
});

describe("writes", () => {
  test("createBook sends a POST with the JSON body", async () => {
    fetchMock.mockResolvedValue(reply(201, book));
    await expect(createBook(newBook)).resolves.toEqual(book);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/books`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init?.body as string)).toEqual(newBook);
  });

  test("replaceBook sends a PUT to the id of the book", async () => {
    fetchMock.mockResolvedValue(reply(200, book));
    const data: NewBook = { ...newBook, status: "reading" };
    await replaceBook("b1", data);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/books/b1`);
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual(data);
  });

  test("deleteBook sends a DELETE and accepts the empty 204", async () => {
    fetchMock.mockResolvedValue(reply(204));
    await expect(deleteBook("b1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books/b1`, {
      method: "DELETE",
    });
  });

  test("encodes the id in the path", async () => {
    fetchMock.mockResolvedValue(reply(204));
    await deleteBook("a/b?c");
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/books/a%2Fb%3Fc`);
  });
});

describe("errors", () => {
  test("uses the error of the API", async () => {
    fetchMock.mockResolvedValue(
      reply(400, { error: "title must be a non-empty text" })
    );
    await expect(createBook(newBook)).rejects.toThrow(
      "title must be a non-empty text"
    );
  });

  test("uses the error of a 404", async () => {
    fetchMock.mockResolvedValue(reply(404, { error: "Book not found" }));
    await expect(deleteBook("nope")).rejects.toThrow("Book not found");
  });

  test.each([
    ["a body that is not JSON", () => new Response("<html>", { status: 502 })],
    ["JSON without an error", () => reply(500, { message: "x" })],
    ["an error that is not a text", () => reply(500, { error: 5 })],
  ])("falls back to the status for %s", async (_name, makeResponse) => {
    fetchMock.mockResolvedValue(makeResponse());
    await expect(listBooks()).rejects.toThrow(/^Request failed \(5\d\d\)$/);
  });

  test("tells that the server is not reachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(listBooks()).rejects.toThrow(/Cannot reach the server/);
  });
});
