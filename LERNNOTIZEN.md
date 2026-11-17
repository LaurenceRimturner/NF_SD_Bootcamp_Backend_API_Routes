# Lernnotizen: Reading List API

Zusammenfassung der Erklärungen, Slice für Slice. Jeder Slice endet mit einem Commit.

| Slice | Inhalt | Regeln bestanden (`npm run check`) |
| ----- | ------ | ---------------------------------- |
| Start | Starter-Code | 7 von 44 |
| 1 | Router, `q`-Filter, `GET /:id` | 9 von 44 |
| 2 | Validierung, `express.json()`, `POST` | 31 von 44 |
| 3 | `PUT`, `DELETE` | 42 von 44 |

## Der Weg einer Anfrage

```
Client → app.ts → express.json() → Router (routes/books.ts) → validation.ts → booksStore → Antwort als JSON
```

- `src/index.ts` startet nur den Server.
- `src/app.ts` setzt die Middleware und die Routen zusammen.
- `src/routes/books.ts` enthält die Routen für `/api/books`.
- `src/validation.ts` prüft Eingaben vom Client.
- `src/store/booksStore.ts` ist die Datenschicht. Routen sprechen nur mit dem Store, nie direkt mit den Daten.

---

## Slice 1: Router, `q` und `GET /:id`

**Router.** `Router()` ist eine Mini-App nur für Routen. `app.use("/api/books", booksRouter)` schickt alle Anfragen mit diesem Präfix dorthin. Im Router bedeutet `"/"` also `/api/books` und `"/:id"` bedeutet `/api/books/<id>`.

**Query-Werte prüfen.** `request.query` enthält nicht immer Text: `?q=a&q=b` wird zu einer Liste. Darum wird der Typ geprüft (`typeof q !== "string"` → 400), statt dem Wert zu vertrauen.

**Reihenfolge der Routen.** Express prüft Routen von oben nach unten. `/:id` passt auf jedes einzelne Segment. Stünde es vor `/count`, würde `GET /api/books/count` als id `"count"` behandelt und mit 404 antworten. Darum steht `/count` davor.

**404 über den Store.** `booksStore.get` gibt `undefined` zurück, wenn es das Buch nicht gibt. Die Route macht daraus `404 { "error": "Book not found" }`. Nach dem Senden steht immer ein `return`, sonst würde der Code weiterlaufen und eine zweite Antwort senden.

**Kurz:** Ein Router gruppiert Routen unter einem Präfix, Query-Werte brauchen eine Typprüfung, spezifische Routen stehen vor Parameter-Routen, und `undefined` aus dem Store wird zu einem 404.

---

## Slice 2: Validierung, `express.json()` und `POST`

### `express.json()` in `app.ts`

```ts
app.use(express.json());
```

Dieser Parser liest den Body einer Anfrage und legt ihn als Objekt in `request.body`. Ohne ihn ist `request.body` `undefined`. Er steht **vor den Routen**, sonst sehen die Routen den Body nie.

### `validateBookInput` in `src/validation.ts`

Eine einzige Funktion für `POST` und später `PUT`. So gelten überall dieselben Regeln, und sie sind an einer Stelle zu ändern.

**Rückgabe als Union-Typ:**

```ts
type ValidationResult =
  | { ok: true; value: NewBook }
  | { ok: false; error: string };
```

Die Funktion wirft keine Exception, sondern liefert entweder das saubere Buch oder eine Fehlermeldung. In der Route prüft man `result.ok`, und TypeScript weiß danach, welche Variante vorliegt (`result.value` oder `result.error`).

**Schritt für Schritt:**

1. **Body ist ein Objekt?** `null`, eine Liste oder gar kein Body (`undefined`) werden abgelehnt, ohne Absturz. Man beachte: `typeof null === "object"`, darum die extra Prüfung `body === null`.
2. **`body` als `unknown`.** Alles vom Client ist `unknown`, nicht `any`. Erst nach der Prüfung darf man den Wert benutzen. Mit `as Record<string, unknown>` lesen wir die Felder aus, aber jedes Feld bleibt `unknown`, bis es geprüft ist.
3. **`title` und `author`:** müssen ein Text sein (`typeof ... !== "string"`) und nach `trim()` nicht leer. Ein Titel `5` fällt durch, ein Titel `"   "` auch.
4. **`status`:** optional, aber wenn vorhanden, muss er einer von `want-to-read`, `reading`, `done` sein.
5. **`rating`:** optional. Erlaubt ist `null` oder eine **ganze Zahl von 1 bis 5**. `"4"` (Text), `3.5`, `0` und `6` werden abgelehnt (`typeof === "number"`, `Number.isInteger`, Bereich).
6. **`notes`:** optional, muss ein Text sein.

**Nur bekannte Felder werden kopiert.** Am Ende wird ein *neues* Objekt gebaut:

```ts
value: { title: title.trim(), author: author.trim(),
         status: status ?? "want-to-read", rating: rating ?? null, notes: notes ?? "" }
```

Alles andere im Body wird ignoriert. Ein Client kann also keine `id` setzen. Der Operator `??` setzt den Standardwert nur bei `undefined` (oder `null`). Darum bleibt ein `rating: null` ein `null`, und ein fehlendes `rating` wird auch `null`.

**Type Guards.** `isStatus(value): value is Status` und `isRating(value): value is number` sagen TypeScript: "Wenn ich `true` zurückgebe, ist der Wert von diesem Typ." So braucht man kein `any` und keine unsicheren Casts. `isStatus` ist exportiert, weil die Route es für den `?status=`-Filter wiederverwendet. So gibt es nur eine Kopie.

### `POST` in `src/routes/books.ts`

```ts
const result = validateBookInput(request.body);
if (!result.ok) { response.status(400).json({ error: result.error }); return; }
response.status(201).json(await booksStore.create(result.value));
```

- Ungültig → `400 { "error": "<Nachricht>" }`.
- Gültig → der Store erzeugt die `id` (`randomUUID`), die Antwort ist `201 Created` mit dem neuen Buch.
- Gespeichert wird `result.value` (das saubere Objekt), nie `request.body` direkt.

### Noch offen (Slice 4)

Kaputtes JSON (`{"title": "oops`) lässt `express.json()` einen Fehler werfen. Ohne eigenen Fehler-Handler antwortet Express mit seiner Standardseite (HTML). Das widerspricht dem Vertrag (`{ "error": ... }`) und kann Interna verraten. Die zwei Regeln "invalid JSON" schlagen deshalb noch fehl, bis der Error-Handler in Slice 4 gebaut ist.

**Kurz:** Ein Parser macht aus dem Body ein Objekt, die Validierung prüft jeden Typ einzeln und baut ein neues, sauberes Objekt, und die Route antwortet 400 oder 201.

---

## Slice 3: `PUT` und `DELETE`

### `PUT /:id` (Buch ersetzen)

```ts
const result = validateBookInput(request.body);
if (!result.ok) { 400 }
const book = await booksStore.replace(request.params.id, result.value);
if (book === undefined) { 404 }
response.json(book);
```

- **Dieselbe Validierung wie bei `POST`.** Das war der Grund für die eine gemeinsame Funktion: `PUT` ersetzt alle bearbeitbaren Felder und folgt denselben Regeln. Es gibt keinen zweiten Satz Regeln, der abweichen könnte.
- **Reihenfolge: erst prüfen (400), dann speichern (404).** Ein ungültiger Body ändert nie etwas. Der Test "invalid status keeps the book" prüft genau das.
- **Die `id` ändert sich nie.** Der Store setzt `{ id, ...input }` mit der `id` aus der URL. Die Validierung kopiert ohnehin nur bekannte Felder, eine `id` im Body wird also ignoriert.
- **404 über den Store.** `replace` gibt `undefined` zurück, wenn es die `id` nicht gibt. Die Antwort ist `404 { "error": "Book not found" }`.
- **Erfolg:** `200` mit dem ersetzten Buch.

### `DELETE /:id`

```ts
const removed = await booksStore.remove(request.params.id);
if (!removed) { 404 }
response.status(204).send();
```

- `remove` gibt `true` oder `false` zurück, je nachdem, ob etwas gelöscht wurde.
- **`204 No Content` hat keinen Body.** Darum `send()` statt `json(...)`. Das ist die einzige Ausnahme von "jede Antwort ist JSON".
- **Zweimal löschen:** Beim zweiten Mal gibt es das Buch nicht mehr, also `404`. Der Test "delete twice" prüft das.

### `PUT` oder `POST`?

`POST /api/books` legt ein neues Buch an, und der Server erzeugt die `id`. `PUT /api/books/:id` ersetzt ein vorhandenes Buch, und die `id` steht im Pfad. Bei `PUT` müssen alle Pflichtfelder (`title`, `author`) wieder mitgeschickt werden, weil das ganze Buch ersetzt wird. Wer nur ein Feld ändern will, braucht `PATCH` (Bonus).

### Noch offen (Slice 4)

Die zwei letzten Regeln ("invalid JSON" bei `POST` und `PUT`) brauchen den Error-Handler.

**Kurz:** `PUT` nutzt dieselbe Validierung wie `POST`, prüft zuerst und speichert danach, `DELETE` antwortet mit `204` ohne Body, und beide machen aus dem Store-Signal "nicht gefunden" ein `404`.
