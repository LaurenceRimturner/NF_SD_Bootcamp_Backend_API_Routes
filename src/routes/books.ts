import { Router } from "express";

import { booksStore } from "../store/booksStore";
import { STATUSES, type Status } from "../types";

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

  response.json(await booksStore.list({ status, q }));
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

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && STATUSES.includes(value as Status);
}
