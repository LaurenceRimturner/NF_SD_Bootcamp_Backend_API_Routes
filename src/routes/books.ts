import { Router } from "express";

import { booksStore } from "../store/booksStore";
import { STATUSES } from "../types";
import {
  isStatus,
  validateBookInput,
  validateBookPatch,
  validateListOptions,
} from "../validation";

export const booksRouter = Router();

booksRouter.get("/", async (request, response) => {
  const { status, q } = request.query;

  if (status !== undefined && !isStatus(status)) {
    response
      .status(400)
      .json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    return;
  }

  if (q !== undefined && typeof q !== "string") {
    response.status(400).json({ error: "q must be a single text" });
    return;
  }

  const options = validateListOptions(request.query);

  if (!options.ok) {
    response.status(400).json({ error: options.error });
    return;
  }

  const { sort, limit, offset } = options.value;
  const books = await booksStore.list({ status, q });

  if (sort === "title") {
    books.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );
  }

  response.json(books.slice(offset, limit === undefined ? undefined : offset + limit));
});

// Must stay above "/:id", otherwise "count" would be read as an id.
booksRouter.get("/count", async (_request, response) => {
  response.json({ count: await booksStore.count() });
});

booksRouter.get("/:id", async (request, response) => {
  const book = await booksStore.get(request.params.id);

  if (book === undefined) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.json(book);
});

booksRouter.post("/", async (request, response) => {
  const result = validateBookInput(request.body);

  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  response.status(201).json(await booksStore.create(result.value));
});

booksRouter.put("/:id", async (request, response) => {
  const result = validateBookInput(request.body);

  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  const book = await booksStore.replace(request.params.id, result.value);

  if (book === undefined) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.json(book);
});

booksRouter.patch("/:id", async (request, response) => {
  const result = validateBookPatch(request.body);

  if (!result.ok) {
    response.status(400).json({ error: result.error });
    return;
  }

  const current = await booksStore.get(request.params.id);

  if (current === undefined) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  const { id: _id, ...editable } = current;
  const book = await booksStore.replace(request.params.id, {
    ...editable,
    ...result.value,
  });

  if (book === undefined) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.json(book);
});

booksRouter.delete("/:id", async (request, response) => {
  const removed = await booksStore.remove(request.params.id);

  if (!removed) {
    response.status(404).json({ error: "Book not found" });
    return;
  }

  response.status(204).send();
});
