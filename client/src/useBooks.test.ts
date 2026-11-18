import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as api from "./api";
import type { Book, NewBook } from "./types";
import { useBooks } from "./useBooks";

vi.mock("./api");

const dune: Book = {
  id: "b1",
  title: "Dune",
  author: "Frank Herbert",
  status: "reading",
  rating: 4,
  notes: "Slow start",
};
const emma: Book = { ...dune, id: "b2", title: "Emma", author: "Jane Austen" };

const piranesi: NewBook = {
  title: "Piranesi",
  author: "Susanna Clarke",
  status: "want-to-read",
  rating: null,
  notes: "",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listBooks).mockResolvedValue([dune, emma]);
});

async function loaded() {
  const hook = renderHook(() => useBooks());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useBooks", () => {
  test("is loading first, then has the books of the API", async () => {
    const { result } = renderHook(() => useBooks());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([dune, emma]);
    expect(result.current.error).toBeNull();
    expect(api.listBooks).toHaveBeenCalledWith("all");
  });

  test("shows the error when the books cannot be loaded", async () => {
    vi.mocked(api.listBooks).mockRejectedValue(
      new Error("Cannot reach the server")
    );
    const { result } = await loaded();
    expect(result.current.error).toBe("Cannot reach the server");
    expect(result.current.books).toEqual([]);
  });

  test("loads again with the status when the filter changes", async () => {
    const { result } = await loaded();
    vi.mocked(api.listBooks).mockResolvedValue([emma]);
    act(() => result.current.setStatus("done"));
    await waitFor(() => expect(result.current.books).toEqual([emma]));
    expect(api.listBooks).toHaveBeenLastCalledWith("done");
  });

  test("adds a book and loads the list again", async () => {
    const { result } = await loaded();
    const created: Book = { ...piranesi, id: "b3" };
    vi.mocked(api.createBook).mockResolvedValue(created);
    vi.mocked(api.listBooks).mockResolvedValue([dune, emma, created]);

    let ok = false;
    await act(async () => {
      ok = await result.current.addBook(piranesi);
    });

    expect(ok).toBe(true);
    expect(api.createBook).toHaveBeenCalledWith(piranesi);
    await waitFor(() => expect(result.current.books).toHaveLength(3));
  });

  test("replaces the whole book with the changes merged in", async () => {
    const { result } = await loaded();
    vi.mocked(api.replaceBook).mockResolvedValue({ ...dune, status: "done" });

    await act(async () => {
      await result.current.updateBook("b1", { status: "done" });
    });

    expect(api.replaceBook).toHaveBeenCalledWith("b1", {
      title: "Dune",
      author: "Frank Herbert",
      status: "done",
      rating: 4,
      notes: "Slow start",
    });
  });

  test("deletes a book and loads the list again", async () => {
    const { result } = await loaded();
    vi.mocked(api.deleteBook).mockResolvedValue(undefined);
    vi.mocked(api.listBooks).mockResolvedValue([emma]);

    await act(async () => {
      await result.current.deleteBook("b1");
    });

    expect(api.deleteBook).toHaveBeenCalledWith("b1");
    await waitFor(() => expect(result.current.books).toEqual([emma]));
  });

  test("shows the error of a failed write and does not reload", async () => {
    const { result } = await loaded();
    vi.mocked(api.createBook).mockRejectedValue(
      new Error("author must be a non-empty text")
    );
    const calls = vi.mocked(api.listBooks).mock.calls.length;

    let ok = true;
    await act(async () => {
      ok = await result.current.addBook({ ...piranesi, author: "" });
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe("author must be a non-empty text");
    expect(api.listBooks).toHaveBeenCalledTimes(calls);
  });

  test("does not call the API for a book that is not in the list", async () => {
    const { result } = await loaded();
    await act(async () => {
      await result.current.updateBook("nope", { status: "done" });
    });
    expect(api.replaceBook).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Book not found");
  });
});
