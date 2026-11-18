import { useEffect, useState } from "react";

import * as api from "./api";
import type { Book, NewBook, StatusFilter } from "./types";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Changes after every successful write, so the list is loaded again from the server.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Ignores the answer of an older request when the filter changed in the meantime.
    let ignore = false;
    setLoading(true);
    api
      .listBooks(status)
      .then((loaded) => {
        if (!ignore) {
          setBooks(loaded);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!ignore) {
          setError(messageOf(reason));
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [status, version]);

  /** Runs a write. Shows the new state of the server on success and the error on failure. */
  async function write(action: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    try {
      await action();
      setVersion((current) => current + 1);
      return true;
    } catch (reason) {
      setError(messageOf(reason));
      return false;
    }
  }

  function addBook(newBook: NewBook): Promise<boolean> {
    return write(() => api.createBook(newBook));
  }

  function updateBook(id: string, changes: Partial<NewBook>): Promise<boolean> {
    const book = books.find((item) => item.id === id);
    if (book === undefined) {
      setError("Book not found");
      return Promise.resolve(false);
    }
    // `PUT` needs every editable field, so the changes are merged into the book.
    const { id: _id, ...editable } = book;
    return write(() => api.replaceBook(id, { ...editable, ...changes }));
  }

  function deleteBook(id: string): Promise<boolean> {
    return write(() => api.deleteBook(id));
  }

  return {
    books,
    status,
    setStatus,
    loading,
    error,
    addBook,
    updateBook,
    deleteBook,
  };
}
