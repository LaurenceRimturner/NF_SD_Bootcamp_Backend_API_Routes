import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import * as api from "./api";
import App from "./App";
import type { Book } from "./types";

vi.mock("./api");

const dune: Book = {
  id: "b1",
  title: "Dune",
  author: "Frank Herbert",
  status: "reading",
  rating: null,
  notes: "",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listBooks).mockResolvedValue([dune]);
});

test("shows a loading text, then the heading and the books", async () => {
  render(<App />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(await screen.findByText(/Dune by Frank Herbert/)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Reading List" })
  ).toBeInTheDocument();
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
});

test("shows the error when the server cannot be reached", async () => {
  vi.mocked(api.listBooks).mockRejectedValue(
    new Error("Cannot reach the server")
  );
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Cannot reach the server"
  );
});

test("sends the status filter to the API", async () => {
  render(<App />);
  await screen.findByText(/Dune/);
  await userEvent.selectOptions(screen.getByLabelText("Status"), "done");
  expect(api.listBooks).toHaveBeenLastCalledWith("done");
});

test("adds a book from the form and clears the form", async () => {
  vi.mocked(api.createBook).mockResolvedValue({
    ...dune,
    id: "b2",
    title: "Emma",
  });
  render(<App />);
  await screen.findByText(/Dune/);

  await userEvent.type(screen.getByLabelText("Title"), "Emma");
  await userEvent.type(screen.getByLabelText("Author"), "Jane Austen");
  await userEvent.click(screen.getByRole("button", { name: "Add book" }));

  expect(api.createBook).toHaveBeenCalledWith({
    title: "Emma",
    author: "Jane Austen",
    status: "want-to-read",
    rating: null,
    notes: "",
  });
  expect(screen.getByLabelText("Title")).toHaveValue("");
});

test("shows the error of the API and keeps the form when the add fails", async () => {
  vi.mocked(api.createBook).mockRejectedValue(
    new Error("title must be a non-empty text")
  );
  render(<App />);
  await screen.findByText(/Dune/);

  await userEvent.type(screen.getByLabelText("Author"), "Jane Austen");
  await userEvent.click(screen.getByRole("button", { name: "Add book" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "title must be a non-empty text"
  );
  expect(screen.getByLabelText("Author")).toHaveValue("Jane Austen");
});

test("marks a book as done and deletes it", async () => {
  vi.mocked(api.replaceBook).mockResolvedValue({ ...dune, status: "done" });
  vi.mocked(api.deleteBook).mockResolvedValue(undefined);
  render(<App />);
  await screen.findByText(/Dune/);

  await userEvent.click(screen.getByRole("button", { name: "Mark as done" }));
  expect(api.replaceBook).toHaveBeenCalledWith(
    "b1",
    expect.objectContaining({ status: "done" })
  );

  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(api.deleteBook).toHaveBeenCalledWith("b1");
});
