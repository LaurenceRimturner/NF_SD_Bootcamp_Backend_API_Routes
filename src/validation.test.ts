import { describe, expect, test } from "vitest";

import { isStatus, validateBookInput } from "./validation";

const valid = { title: "Dune", author: "Frank Herbert" };

function errorOf(body: unknown): string {
  const result = validateBookInput(body);
  if (result.ok) {
    throw new Error("expected the validation to fail");
  }
  return result.error;
}

describe("validateBookInput: body", () => {
  test.each([
    ["null", null],
    ["undefined", undefined],
    ["a list", [valid]],
    ["a text", "Dune"],
    ["a number", 5],
    ["a boolean", true],
  ])("rejects %s", (_name, body) => {
    expect(errorOf(body)).toBe("Body must be a JSON object");
  });
});

describe("validateBookInput: title and author", () => {
  test.each([
    ["missing", undefined],
    ["a number", 5],
    ["null", null],
    ["a list", ["Dune"]],
    ["an object", { name: "Dune" }],
    ["empty", ""],
    ["only spaces", "   "],
    ["only tabs and newlines", "\t\n"],
  ])("rejects a title that is %s", (_name, title) => {
    expect(errorOf({ ...valid, title })).toMatch(/^title /);
  });

  test.each([
    ["missing", undefined],
    ["a number", 5],
    ["empty", ""],
    ["only spaces", "   "],
  ])("rejects an author that is %s", (_name, author) => {
    expect(errorOf({ ...valid, author })).toMatch(/^author /);
  });

  test("trims title and author", () => {
    const result = validateBookInput({ title: "  Dune ", author: " Frank Herbert  " });
    expect(result).toMatchObject({
      ok: true,
      value: { title: "Dune", author: "Frank Herbert" },
    });
  });
});

describe("validateBookInput: status", () => {
  test.each(["want-to-read", "reading", "done"])("accepts %s", (status) => {
    expect(validateBookInput({ ...valid, status })).toMatchObject({
      ok: true,
      value: { status },
    });
  });

  test.each([
    ["an unknown text", "finished"],
    ["other casing", "Done"],
    ["null", null],
    ["a number", 1],
    ["empty", ""],
  ])("rejects a status that is %s", (_name, status) => {
    expect(errorOf({ ...valid, status })).toMatch(/^status must be one of/);
  });
});

describe("validateBookInput: rating", () => {
  test.each([1, 2, 3, 4, 5, null])("accepts %s", (rating) => {
    expect(validateBookInput({ ...valid, rating })).toMatchObject({
      ok: true,
      value: { rating },
    });
  });

  test.each([
    ["zero", 0],
    ["six", 6],
    ["negative", -1],
    ["a decimal", 3.5],
    ["a text", "4"],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a boolean", true],
    ["a list", [4]],
  ])("rejects a rating that is %s", (_name, rating) => {
    expect(errorOf({ ...valid, rating })).toMatch(/^rating must be/);
  });
});

describe("validateBookInput: notes", () => {
  test("accepts a text and an empty text", () => {
    expect(validateBookInput({ ...valid, notes: "Great" })).toMatchObject({
      ok: true,
      value: { notes: "Great" },
    });
    expect(validateBookInput({ ...valid, notes: "" })).toMatchObject({
      ok: true,
      value: { notes: "" },
    });
  });

  test.each([
    ["a number", 7],
    ["null", null],
    ["a list", ["a"]],
  ])("rejects notes that are %s", (_name, notes) => {
    expect(errorOf({ ...valid, notes })).toBe("notes must be a text");
  });
});

describe("validateBookInput: result", () => {
  test("fills the defaults", () => {
    expect(validateBookInput(valid)).toEqual({
      ok: true,
      value: {
        title: "Dune",
        author: "Frank Herbert",
        status: "want-to-read",
        rating: null,
        notes: "",
      },
    });
  });

  test("copies only the known fields, so the client cannot set the id", () => {
    const result = validateBookInput({ ...valid, id: "hacked", extra: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual([
        "author",
        "notes",
        "rating",
        "status",
        "title",
      ]);
    }
  });

  test("does not change the body", () => {
    const body = { title: " Dune ", author: "Frank Herbert" };
    validateBookInput(body);
    expect(body).toEqual({ title: " Dune ", author: "Frank Herbert" });
  });

  test("reports the first problem when several fields are wrong", () => {
    expect(errorOf({ title: 5, author: 5, rating: 9 })).toMatch(/^title /);
  });
});

describe("isStatus", () => {
  test("accepts the three statuses only", () => {
    expect(isStatus("done")).toBe(true);
    expect(isStatus("finished")).toBe(false);
    expect(isStatus(undefined)).toBe(false);
    expect(isStatus(["done"])).toBe(false);
  });
});
