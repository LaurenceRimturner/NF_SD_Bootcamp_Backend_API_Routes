import { useState, type SyntheticEvent } from "react";

import { STATUS_LABELS } from "./books";
import type { StatusFilter } from "./types";
import { useBooks } from "./useBooks";

export default function App() {
  const { books, status, setStatus, loading, error, addBook, updateBook, deleteBook } =
    useBooks();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const added = await addBook({
      title,
      author,
      status: "want-to-read",
      rating: null,
      notes: "",
    });
    if (added) {
      setTitle("");
      setAuthor("");
    }
  }

  return (
    <main>
      <h1>Reading List</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Author
          <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </label>
        <button type="submit">Add book</button>
      </form>

      <label>
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
        >
          <option value="all">All</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {error !== null && <p role="alert">{error}</p>}
      {loading ? <p>Loading...</p> : <p>{books.length} books</p>}

      <ul>
        {books.map((book) => (
          <li key={book.id}>
            {book.title} by {book.author} ({book.status}){" "}
            {book.status !== "done" && (
              <button onClick={() => updateBook(book.id, { status: "done" })}>
                Mark as done
              </button>
            )}{" "}
            <button onClick={() => deleteBook(book.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
