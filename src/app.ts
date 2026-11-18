import cors from "cors";
import express from "express";

import { errorHandler, notFoundHandler } from "./middleware/errors";
import { booksRouter } from "./routes/books";

/** The React app in `client/`. Only this origin may call the API from a browser. */
export const CLIENT_ORIGIN = "http://localhost:3000";

export const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/books", booksRouter);

app.use(notFoundHandler);
app.use(errorHandler);
