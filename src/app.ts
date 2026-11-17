import express from "express";

import { booksRouter } from "./routes/books";

export const app = express();

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/books", booksRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});
