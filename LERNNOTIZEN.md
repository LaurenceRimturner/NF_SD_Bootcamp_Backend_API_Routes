# Lernnotizen: Reading List API

Eine Anleitung zum Verstehen und Merken, Slice für Slice. Jeder Slice endete mit einem Commit.
Überall, wo du dir etwas einprägen sollst, steht ein **Merksatz**.

| Slice | Inhalt | Regeln bestanden (`npm run check`) |
| ----- | ------ | ---------------------------------- |
| Start | Starter-Code | 7 von 44 |
| 1 | Router, `q`-Filter, `GET /:id` | 9 von 44 |
| 2 | Validierung, `express.json()`, `POST` | 31 von 44 |
| 3 | `PUT`, `DELETE` | 42 von 44 |
| 4 | 404-Handler, Error-Handler | 44 von 44 |

---

## 0. Grundlagen, die du brauchst

### Was ist eine REST-API?
Ein Programm (der Server), das Anfragen (Requests) über HTTP entgegennimmt und Antworten (Responses) als JSON zurückgibt. Unser Server verwaltet eine Liste von Büchern.

Eine Anfrage besteht aus:
- **Methode:** was soll passieren? (`GET`, `POST`, `PUT`, `DELETE`)
- **Pfad:** auf welche Ressource? (`/api/books/42`)
- **Query:** Filter hinter dem `?` (`/api/books?status=done&q=dune`)
- **Body:** Daten, die mitgeschickt werden (nur bei `POST` und `PUT`)

### Die vier Methoden (CRUD)

| Methode | Pfad | Bedeutung | Erfolg |
| ------- | ---- | --------- | ------ |
| `GET` | `/api/books` | Liste lesen | 200 |
| `GET` | `/api/books/:id` | ein Buch lesen | 200 |
| `POST` | `/api/books` | neues Buch anlegen | 201 |
| `PUT` | `/api/books/:id` | Buch ersetzen | 200 |
| `DELETE` | `/api/books/:id` | Buch löschen | 204 |

**Merksatz:** *GET liest, POST legt neu an, PUT ersetzt, DELETE löscht.*

### Statuscodes: die erste Ziffer sagt alles

| Code | Bedeutung | Wann bei uns |
| ---- | --------- | ------------ |
| 200 | OK | gelesen oder ersetzt |
| 201 | Created | Buch angelegt |
| 204 | No Content | gelöscht, **kein Body** |
| 400 | Bad Request | Eingabe ungültig (Schuld beim Client) |
| 404 | Not Found | Buch oder Route gibt es nicht |
| 500 | Internal Server Error | Fehler im Server (Schuld beim Server) |

**Merksatz:** *2xx = geklappt, 4xx = du hast einen Fehler gemacht, 5xx = ich habe einen Fehler gemacht.*

### Was ist Middleware?
Eine Funktion, durch die jede Anfrage läuft, bevor sie bei der Route ankommt. Sie kann die Anfrage verändern, selbst antworten oder sie mit `next()` weitergeben. `express.json()` ist so eine Middleware.

**Merksatz:** *Eine Anfrage läuft wie durch ein Rohr: von oben nach unten durch jede Middleware und Route, bis jemand antwortet.*

### Der Weg einer Anfrage

```
Client
  → app.ts            (setzt alles zusammen)
  → express.json()    (macht aus dem Body ein Objekt)
  → Router            (src/routes/books.ts)
  → validation.ts     (prüft die Eingabe)
  → booksStore        (Daten lesen/schreiben)
  → Antwort als JSON
```

| Datei | Aufgabe |
| ----- | ------- |
| `src/index.ts` | startet nur den Server (`listen`) |
| `src/app.ts` | baut die App: Middleware, Routen, Fehler-Handler |
| `src/routes/books.ts` | die Routen von `/api/books` |
| `src/validation.ts` | prüft Daten vom Client |
| `src/middleware/errors.ts` | 404- und Fehler-Handler |
| `src/store/booksStore.ts` | die Daten (fertig, nicht ändern) |

**Merksatz:** *Jede Datei hat genau eine Aufgabe. Die Routen reden nur mit dem Store, nie direkt mit den Daten.* So kann man später eine Datenbank einbauen, ohne die Routen zu ändern.

---

## Slice 1: Router, `q` und `GET /:id`

### Der Router
`Router()` ist eine Mini-App nur für Routen. In `app.ts` steht:

```ts
app.use("/api/books", booksRouter);
```

Das heißt: alles, was mit `/api/books` beginnt, geht an den Router. Dort sind die Pfade relativ: `"/"` bedeutet `/api/books`, `"/:id"` bedeutet `/api/books/<id>`.

**Merksatz:** *Ein Router gruppiert zusammengehörige Routen unter einem Präfix, damit `app.ts` übersichtlich bleibt.*

### Query-Werte sind nicht immer Text
`request.query` kann Text, eine Liste (`?q=a&q=b`) oder mehr enthalten. Darum:

```ts
if (q !== undefined && typeof q !== "string") { 400 }
```

Nach dieser Prüfung weiß TypeScript: `q` ist `string | undefined`.

**Merksatz:** *Alles, was vom Client kommt, ist unsicher. Erst den Typ prüfen, dann benutzen.*

### Die Reihenfolge der Routen
Express prüft von oben nach unten und nimmt die **erste** passende Route. `/:id` passt auf jedes einzelne Segment, auch auf `count`. Stünde `/:id` vor `/count`, würde `GET /api/books/count` als id `"count"` behandelt und mit 404 antworten.

```ts
booksRouter.get("/count", ...);   // zuerst: die spezielle Route
booksRouter.get("/:id", ...);     // danach: die allgemeine Route
```

**Merksatz:** *Spezielle Routen vor Routen mit Parameter. Die erste passende Route gewinnt.*

### 404 über den Store
`booksStore.get` gibt `undefined` zurück, wenn es das Buch nicht gibt. Die Route macht daraus `404 { "error": "Book not found" }` und beendet sich mit `return`.

**Merksatz:** *Nach dem Senden immer `return`. Sonst läuft der Code weiter und versucht, eine zweite Antwort zu senden.*

### Type Guard `isStatus`
```ts
function isStatus(value: unknown): value is Status
```
Der Rückgabetyp `value is Status` sagt TypeScript: "Wenn ich `true` zurückgebe, ist der Wert ein `Status`." So braucht man kein `any` und keinen Cast in der Route.

**Merksatz:** *Ein Type Guard prüft zur Laufzeit und überzeugt gleichzeitig den Compiler.*

---

## Slice 2: Validierung, `express.json()` und `POST`

### `express.json()`
```ts
app.use(express.json());
```
Liest den Body der Anfrage und legt ihn als Objekt in `request.body`. Ohne diese Zeile ist `request.body` `undefined`. Sie steht **vor den Routen**.

**Merksatz:** *Ohne `express.json()` sieht keine Route den Body. Die Middleware muss vor den Routen stehen.*

### `validateBookInput`: ein Türsteher für Daten
Die Funktion in `src/validation.ts` prüft den Body und gibt entweder das saubere Buch oder eine Fehlermeldung zurück. Sie wirft keinen Fehler, sondern liefert einen Union-Typ:

```ts
type ValidationResult =
  | { ok: true; value: NewBook }
  | { ok: false; error: string };
```

In der Route:

```ts
const result = validateBookInput(request.body);
if (!result.ok) { response.status(400).json({ error: result.error }); return; }
// ab hier weiß TypeScript: result.value existiert
```

**Merksatz:** *Prüfen, dann bauen: nur geprüfte Daten kommen in den Store.*

### Die Prüfungen der Reihe nach

| Feld | Regel | Fällt durch |
| ---- | ----- | ----------- |
| Body | ein Objekt | `null`, `[]`, kein Body |
| `title`, `author` | Text, nach `trim()` nicht leer | `5`, `""`, `"   "` |
| `status` | optional, einer von `want-to-read`, `reading`, `done` | `"finished"`, `null` |
| `rating` | optional, `null` oder ganze Zahl 1 bis 5 | `0`, `6`, `3.5`, `"4"` |
| `notes` | optional, Text | `7` |

Wichtig: `typeof null === "object"`. Darum braucht die Objektprüfung zusätzlich `body === null`.

**Merksatz:** *Den Typ prüfen, nicht nur "ist da". `"4"` ist wahr, aber keine Zahl.*

### Nur bekannte Felder werden kopiert
```ts
value: {
  title: title.trim(), author: author.trim(),
  status: status ?? "want-to-read", rating: rating ?? null, notes: notes ?? "",
}
```
- Es entsteht ein **neues** Objekt. Alles, was der Client sonst noch schickt (`id`, `extra`), wird ignoriert.
- `??` setzt den Standardwert nur, wenn der Wert `undefined` oder `null` ist.

**Merksatz:** *Nie `request.body` direkt speichern. Ein neues Objekt aus den bekannten Feldern bauen, so kann der Client keine `id` setzen.*

### `unknown` statt `any`
Alles vom Client ist `unknown`: "ich weiß nicht, was es ist, also muss ich prüfen." `any` würde die Prüfung abschalten.

**Merksatz:** *`unknown` zwingt zum Prüfen, `any` erlaubt alles. In diesem Projekt gibt es kein `any`.*

### `POST` in der Route
```ts
const result = validateBookInput(request.body);
if (!result.ok) { 400 }
response.status(201).json(await booksStore.create(result.value));
```
Der Store erzeugt die `id` (`randomUUID`). Die Antwort ist `201 Created` mit dem neuen Buch.

**Merksatz:** *POST: erst prüfen (400), dann anlegen (201). Die `id` macht der Server.*

---

## Slice 3: `PUT` und `DELETE`

### `PUT /:id`: ein Buch ersetzen
```ts
const result = validateBookInput(request.body);
if (!result.ok) { 400 }
const book = await booksStore.replace(request.params.id, result.value);
if (book === undefined) { 404 }
response.json(book);
```

- **Dieselbe Validierung wie bei `POST`.** Es gibt nur eine Funktion, also keine zwei Regelsätze, die auseinanderlaufen können.
- **Erst prüfen (400), dann speichern (404).** Ein ungültiger Body ändert nie etwas.
- **Die `id` ändert sich nie.** Sie kommt aus der URL. Eine `id` im Body wird ignoriert.
- **Alles wird ersetzt.** Darum müssen `title` und `author` wieder mitgeschickt werden.

**Merksatz:** *PUT ersetzt das ganze Buch, nicht nur ein Feld. Für ein einzelnes Feld gäbe es `PATCH`.*

### `DELETE /:id`
```ts
const removed = await booksStore.remove(request.params.id);
if (!removed) { 404 }
response.status(204).send();
```

- `remove` gibt `true` oder `false` zurück.
- **`204 No Content` hat keinen Body.** Darum `send()` statt `json(...)`. Das ist die einzige Ausnahme von "jede Antwort ist JSON".
- Ein zweites Löschen derselben `id` gibt `404`, weil das Buch schon weg ist.

**Merksatz:** *DELETE antwortet 204 ohne Body. Gibt es nichts zu löschen: 404.*

### POST oder PUT?

| | `POST /api/books` | `PUT /api/books/:id` |
| - | ----------------- | -------------------- |
| Zweck | neues Buch | vorhandenes Buch ersetzen |
| `id` | macht der Server | steht im Pfad |
| Erfolg | 201 | 200 |
| Unbekannte `id` | nicht möglich | 404 |

---

## Slice 4: 404-Handler und Error-Handler

Beide liegen in `src/middleware/errors.ts`.

### Die Reihenfolge in `app.ts` ist wichtig

```ts
app.use(express.json());           // 1. Body lesen
app.get("/api/health", ...);       // 2. Routen
app.use("/api/books", booksRouter);
app.use(notFoundHandler);          // 3. nichts hat gepasst → 404
app.use(errorHandler);             // 4. ganz zuletzt: Fehler auffangen
```

**Merksatz:** *Erst Body-Parser, dann Routen, dann 404, dann Error-Handler. Was nach dem 404-Handler steht, wird nie erreicht.*

### `notFoundHandler`
Hat keinen Pfad, passt also auf alles, was keine Route beantwortet hat: `404 { "error": "Not found" }`. Auch eine unbekannte Methode auf einem bekannten Pfad (`PATCH /api/books`) landet hier.

**Merksatz:** *404 gibt es in zwei Sorten: "Book not found" (die Route kennt das Buch nicht) und "Not found" (es gibt die Route nicht).*

### `errorHandler`: vier Parameter

```ts
(error, _request, response, next) => ...
```

Express erkennt einen Error-Handler **nur an den vier Parametern**. `_next` wird nicht benutzt, darf aber nicht entfernt werden. Sonst wäre es eine normale Middleware und fängt keine Fehler.

Was er tut:
1. **Schon geantwortet?** (`response.headersSent`) → Fehler mit `next(error)` weitergeben.
2. **Kaputtes JSON?** (`type === "entity.parse.failed"`) → `400 { "error": "Body must be valid JSON" }`. Das ist ein Fehler des Clients.
3. **Alles andere** → `500 { "error": "Internal server error" }`. Der echte Fehler kommt nur ins Server-Log (`console.error`), **nie** zum Client.

In Express 5 gehen Fehler aus `async`-Handlern automatisch hierhin. Darum gibt es in den Routen kein `try`/`catch`.

**Merksatz:** *Dem Client nie einen Stack-Trace zeigen. Das Detail ins Log, dem Client nur eine allgemeine Meldung.*

### Zwei Beobachtungen
- Der Body `null` wird schon vom JSON-Parser abgelehnt (er erlaubt auf oberster Ebene nur Objekte und Listen) und endet im Error-Handler.
- Ein Aufruf ganz ohne Body erreicht die Validierung: "Body must be a JSON object". Beides ist ein sauberes 400 ohne Absturz.

---

## Spickzettel: alle Merksätze

1. GET liest, POST legt neu an, PUT ersetzt, DELETE löscht.
2. 2xx = geklappt, 4xx = Fehler des Clients, 5xx = Fehler des Servers.
3. Eine Anfrage läuft von oben nach unten durch Middleware und Routen, bis jemand antwortet.
4. Die Routen reden nur mit dem Store.
5. Ein Router gruppiert Routen unter einem Präfix.
6. Alles vom Client ist unsicher: erst den Typ prüfen, dann benutzen.
7. Spezielle Routen (`/count`) vor Parameter-Routen (`/:id`).
8. Nach dem Senden immer `return`.
9. Ein Type Guard prüft zur Laufzeit und überzeugt den Compiler.
10. `express.json()` gehört vor die Routen.
11. Prüfen, dann bauen: nur geprüfte Daten kommen in den Store.
12. Den Typ prüfen, nicht nur "ist da".
13. Nie `request.body` direkt speichern. Ein neues Objekt aus bekannten Feldern bauen.
14. `unknown` zwingt zum Prüfen, `any` erlaubt alles.
15. PUT ersetzt das ganze Buch, DELETE antwortet 204 ohne Body.
16. Reihenfolge in `app.ts`: Parser, Routen, 404, Error-Handler.
17. Der Error-Handler hat vier Parameter, sonst erkennt Express ihn nicht.
18. Dem Client nie einen Stack-Trace zeigen.

---

## Selbsttest

Versuche zuerst, selbst zu antworten. Die Antworten stehen unten.

1. Warum steht `/count` vor `/:id`?
2. Was passiert, wenn man die `return`-Anweisung nach `response.status(404).json(...)` weglässt?
3. Warum prüft die Validierung `typeof rating === "number"` und nicht nur, ob `rating` einen Wert hat?
4. Warum speichert `POST` nicht einfach `request.body`?
5. Was liefert `PUT /api/books/abc` mit gültigem Body, wenn es die `id` nicht gibt? Und mit ungültigem Body?
6. Warum hat `DELETE` keinen `json(...)`-Aufruf?
7. Woran erkennt Express den Error-Handler?
8. Warum sieht der Client bei einem unerwarteten Fehler nur "Internal server error"?

<details>
<summary>Antworten</summary>

1. `/:id` passt auf jedes Segment, auch auf `count`. Die erste passende Route gewinnt, also muss die spezielle Route zuerst stehen.
2. Der Code läuft weiter und versucht, eine zweite Antwort zu senden. Das führt zu einem Fehler ("headers already sent").
3. `"4"` (Text) ist "wahr", aber keine Zahl. Der Vertrag verlangt `null` oder eine ganze Zahl von 1 bis 5.
4. Sonst könnte ein Client unbekannte Felder oder eine eigene `id` einschleusen. Der Server baut ein neues Objekt aus den geprüften, bekannten Feldern.
5. Mit gültigem Body: `404 Book not found`. Mit ungültigem Body: `400`, weil erst geprüft und dann gespeichert wird.
6. `204 No Content` bedeutet "kein Body". Also `send()` ohne Inhalt.
7. An den vier Parametern `(error, request, response, next)`.
8. Stack-Trace und Fehlerdetails verraten Interna des Servers. Das Detail kommt ins Server-Log, der Client bekommt nur eine allgemeine Meldung.

</details>

---

## Was noch fehlt (optional)

- **Review: was `npm run check` nicht gefunden hat.** Ein Body über 100 KB (`POST` mit 200 KB) und eine kaputte URL (`/api/books/%E0%A4%A`) wurden mit 500 beantwortet, obwohl der Client schuld ist. Das Script prüft nur den Vertrag, nicht diese Fälle. Behoben im `errorHandler`: Fehler mit 4xx-`status` werden als 413 bzw. 400 mit allgemeiner Meldung gesendet, alles andere bleibt 500.
  **Merksatz:** *Ein Check-Script findet nur, woran der Autor gedacht hat. Eigene Fälle ausprobieren (zu groß, kaputt, fremd).*
- **Unit-Tests für `validation.ts`** stehen in `src/validation.test.ts` (51 Tests, Vitest). Was sie **nicht** abdecken:
  - **Keine Höchstlänge.** `title`, `author` und `notes` dürfen beliebig lang sein (bis zum Body-Limit von 100 KB). Dafür gibt es keine Regel, also auch keinen Test. Das ist eine echte Lücke der Validierung.
  - **Unicode-Leerzeichen** (geschütztes Leerzeichen, Zeichen ohne Breite): `trim()` entfernt manche, andere nicht.
  - **Ein Body mit dem Schlüssel `__proto__`.** Vermutlich harmlos, weil die Felder einzeln nach Namen kopiert werden, aber nicht getestet.
  - **Doppelte Bücher** (gleicher Titel und Autor) sind erlaubt.

  **Merksatz:** *Ein Test prüft nur, woran der Autor gedacht hat. Die Lücken stehen dort, wo es auch keine Regel gibt.*
- **Bonus-Aufgaben:** CORS und React-Client, Sortieren und Paging (`?sort=`, `?limit=`, `?offset=`), `PATCH`.
- **Daten gehen beim Neustart verloren**, weil sie nur im Arbeitsspeicher liegen. Eine Datenbank würde das lösen, und genau dafür gibt es das `BooksStore`-Interface.
