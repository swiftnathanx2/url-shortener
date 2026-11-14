# URL-SHORTENER-LINKLY

A REST API URL Shortener that makes long links short, redirects visitors to the original link, counts clicks without losing updates and exposes a paginated click log with a csv export.

---

# Live Demo

https://linkly-jlc2.onrender.com/docs

## 📌Problem Statement

The links that most websites generate are often very long and difficult to remember and also not user friendly. Hence there is need to shorten urls to make them easier for users to type and that is where this URL shortener comes in.

---

## Tech Stack

**Language:** JavaScript (Node.js, ES modules)
**Framework:** Express 5
**Project Setup:** scaffolded with gen-express-cli
**Database:** PostgreSQL, accessed with the `pg` driver and plain parameterized SQL (no ORM)
**Validation:** Zod (every request is validated at the boundary)
**Security & middleware:** helmet, cors, hpp, compression
**Logging:** morgan, winston
**API docs:** OpenAPI 3 served with swagger-ui-express
**Testing:** Node's built-in test runner (`node:test`) against a real PostgreSQL test database
**Quality & CI:** ESLint, Prettier, GitHub Actions (with a PostgreSQL service)

---

## Get Started

Follow these steps to get a local API up and running;

### Prerequisites

Ensure you have the following software installed:
[Node.js](https://nodejs.org)(the version in `.nvmrc`)
[PostgreSQL](https://www.postgresql.org) with the `psql` command-line client
[Postman](https://postman.com)

---

### ⚙️ Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/swiftnathanx2/url-shortener.git
   cd url-shortener
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create the databases** (one for development, one for tests):

   ```bash
   psql -U postgres -c "CREATE USER linkly_user WITH PASSWORD 'linkly';"
   psql -U postgres -c "CREATE DATABASE linkly OWNER linkly_user;"
   psql -U postgres -c "CREATE DATABASE linkly_test OWNER linkly_user;"
   ```

4. **Configure environment variables:**
   Duplicate the `.env.example` file and rename it to `.env`:

   ```bash
   cp .env.example .env
   ```

   Open the `.env` file and set your values:

   ```env
   NODE_ENV=development
   PORT=8000
   CORS_ORIGIN=http://localhost:3000
   LOG_LEVEL=info
   DATABASE_URL=postgres://linkly_user:linkly@localhost:5432/linkly
   ```

5. **Create the tables:**

   ```bash
   psql postgres://linkly_user:linkly@localhost:5432/linkly -f src/db/schema.sql

   npm run db:seed
   ```

   The seed adds three sample links: `docs123` and `gh-node` (with sample clicks) and `oldlink`, which is already expired so `GET /oldlink` returns 410. Both commands are safe to run repeatedly.

6. **Start the development server:**
   ```bash
   npm run dev
   ```
   The server should now be running at `http://localhost:8000`, with interactive API docs at `http://localhost:8000/docs`.

For production, use `npm start`.

---

## 📷 Screenshots

![Swagger UI Screenshot](/src/assets/swagger-ui.png)

![Running Tests](/src/assets/running-tests.png)

## 📡 API Documentation

Interactive documentation (powered by Swagger UI) is available at `http://localhost:8000/docs` when the server is running. Every endpoint can be tried from that page.

### Base URL

`http://localhost:8000`

### Core Endpoints

Method | Endpoint

**POST** | `/links`
**GET** | `/:code`
**GET** | `/links/:code`
**GET** | `/links/:code/clicks`
**GET** | `/links/:code/clicks.csv`
**DELETE** | `/links/:code`
**GET** | `/health`

No authentication is required (see Limitations).

### Sample Request/Response

`POST /links`

- **Request Body:**
  ```json
  {
    "target_url": "www.linkedin.com/in/someone",
    "code": "short-x",
    "expires_at": "2027-01-01T00:00:00Z"
  }
  ```
  If the protocol is missing, `https://` is added automatically.
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "code": "short-x",
      "target_url": "https://www.linkedin.com/in/someone",
      "created_at": "2026-11-09T00:59:17.867Z",
      "expires_at": "2027-01-01T00:00:00.000Z",
      "click_count": 0
    }
  }
  ```

`GET /links/short-x/clicks?after=0&limit=2`

- **Success Response (200 OK):**

  ```json
  {
    "status": "success",
    "data": [
      { "id": 1, "clicked_at": "2026-11-09T01:10:02.000Z", "referrer": null, "user_agent": "curl/8.18.0" },
      { "id": 2, "clicked_at": "2026-11-09T01:10:03.000Z", "referrer": null, "user_agent": "curl/8.18.0" }
    ],
    "cursor": 2
  }
  ```

  To get the next page, send the returned `cursor` as `after`. A `cursor` of `null` means this was the last page.

  ### Error responses

Errors share one shape. Validation failures list each problem in an `issues` array:

```json
{
  "statusCode": 400,
  "message": "Validation Error",
  "issues": [{ "path": "body.target_url", "message": "<the rule that failed>" }]
}
```

---

## Index usage for the redirect lookup

## Index usage for the redirect lookup

`links.code` is declared `UNIQUE`, so PostgreSQL automatically keeps an index on it (`links_code_key`). The redirect lookup (`GET /:code`) runs `SELECT id, target_url, expires_at FROM links WHERE code = $1`, so it searches by `code` through that index instead of reading the whole table. This is the plan for a lookup of the seeded link `docs123`:

```text
                                                        QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------
 Index Scan using links_code_key on links  (cost=0.14..8.15 rows=1 width=36) (actual time=0.030..0.030 rows=1.00 loops=1)
   Index Cond: ((code)::text = 'docs123'::text)
   Index Searches: 1
   Buffers: shared hit=2
 Planning:
   Buffers: shared hit=90
 Planning Time: 0.232 ms
 Execution Time: 0.072 ms
(8 rows)
```

The plan was produced with:

```sql
SET enable_seqscan = off;
EXPLAIN ANALYZE SELECT id, target_url, expires_at FROM links WHERE code = 'docs123';
```

The development table only holds a few rows, and on a table that small PostgreSQL would normally choose a plain sequential scan because it is cheaper. I turned sequential scans off for that one session only, to show that the unique index exists and that the lookup can use it. On a larger table, PostgreSQL picks the index scan without any setting.
---

## 🧠 Design Decisions

- **Keyset (cursor) pagination, not OFFSET.** OFFSET gets slower the deeper you page and can repeat or skip rows when clicks arrive during paging. Keyset asks for "clicks after this id", which stays fast and stable.
- **Atomic click counter.** Each visit inserts the click and runs `UPDATE links SET click_count = click_count + 1` in one transaction, so simultaneous visits cannot lose updates.
- **302 redirects, not 301.** Browsers cache a 301 and would skip the server on repeat visits, so those clicks would never be counted.
- **Validation at the boundary, parameterized SQL everywhere.** Zod validates every request and the code only uses the parsed result. No SQL is built by string concatenation.
- **CSV export is streamed in pages**, so a link with millions of clicks cannot fill the server's memory. Values are escaped, and values that start with `=`, `+`, `-` or `@` are neutralized against spreadsheet formula injection.

---

## 📂 Project Architecture

```text
├── .github/workflows/   # CI: format check, lint, tests against a PostgreSQL service
├── src/
│   ├── config/          # Reads and validates environment variables
│   ├── db/              # PostgreSQL pool (index.js) and the schema (schema.sql)
│   ├── docs/            # The OpenAPI document served at /docs
│   ├── middlewares/     # Request validation, error handling, logging
│   ├── modules/
│   │   ├── healthcheck/ # GET /health
│   │   └── link/        # Routes, controller, service and Zod schemas for links, clicks and redirects
│   ├── utils/           # Short-code generator and CSV helper
│   ├── app.js           # createApp(): builds the Express app (does not start it)
│   └── server.js        # Entry point: starts listening
```

A request travels: **route → validation → controller → service → database**. The controller handles HTTP, and only the service talks to PostgreSQL.

---

## 🧪 Running Tests

This project uses Node's built-in test runner. The API tests send real HTTP requests to the app and check the real PostgreSQL test database, which is emptied before each test.

1. Create `.env.test` in the project root:
   ```env
   NODE_ENV=test
   LOG_LEVEL=error
   DATABASE_URL=postgres://linkly_user:linkly@localhost:5432/linkly_test
   ```
2. Create the tables in the test database:
   ```bash
   psql postgres://linkly_user:linkly@localhost:5432/linkly_test -f src/db/schema.sql
   ```
3. Run the tests:
   ```bash
   # Run all tests
   npm test

   # Run tests in watch mode
   npm run test:watch

   # Generate test coverage reports
   npm run test:cov
   ```

The tests refuse to run unless the connected database name contains `test`. They cover:

- the status codes of every endpoint (201, 302, 400, 404, 409, 410, 204)
- paging through the click log with no skipped or repeated rows
- the click counter staying exact under 20 simultaneous visits
- an injection attempt staying harmless
- deleting a link also deleting its clicks
- the CSV export and its escaping helper

---

## ⚠️ Limitations

- There is no authentication, so anyone can delete any link.
- There is no rate limiting on link creation.
- If an error occurs midway through a CSV download, the response has already started, so the file simply ends early.

---

## Challenges Faced

-Understanding the structure and flow of a backend service with express and a scaffold.
-Difficulties connecting the database due to confusion about env's.
-How pagination works posed a bit of a challenge
-Faced difficulties writing tests.

---

## What I learned

- Understood how requests and responses travel throughout the entire application tree
- Writing unit and integration tests
- Structuring folders by feature.

### Future Improvements

- Connect a front-end
- Add authentication

👨🏽‍💻 Author

Nyoh Jonathan Smith K.
Junior Fullstack Developer

📩 Email: swiftnathan702@gmail.com

🌍 Based in Cameroon | Open to remote opportunities
