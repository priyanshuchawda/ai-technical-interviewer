Custom Backend Integration
Connect your custom applications or agents directly using the Breeth REST API.

Drop Breeth into your own backend. The REST API is what every client (Claude, ChatGPT, the SDKs) eventually hits.

1
Add memory
Send a POST request to add conversation history to memory.
·
POST /v1/episodes
·
Bearer token in Authorization header
·
Breeth extracts entities, intents, and edges into the graph
bash
Copy
curl --request POST \
  --url https://api.thebreeth.com/v1/episodes \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "messages": [
      { "role": "user", "content": "Hi, I am Alex. I am a vegetarian and allergic to nuts." },
      { "role": "assistant", "content": "Got it — vegetarian, no nuts." }
    ]
  }'
2
Search memory
Query the graph for relevant episodes by intent or entity.
·
POST /v1/search
·
Returns ranked episodes with their narratives
·
limit caps how many hits come back (default 10)
bash
Copy
curl --request POST \
  --url https://api.thebreeth.com/v1/search \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "query": "What can Alex eat?",
    "limit": 5
  }'


y

# REST API overview (/docs/api/overview)



## Base URL [#base-url]

```
https://api.thebreeth.com
```

All endpoints are prefixed with `/v1`. The current API version is `v1`.

## Authentication [#authentication]

Every request must carry a Bearer token. Two token types are accepted:

| Token         | Format      | Use case                                   |
| ------------- | ----------- | ------------------------------------------ |
| **API key**   | `ck_live_…` | Agents, scripts, the MCP server            |
| **Clerk JWT** | `eyJ…`      | Dashboard sessions (handled automatically) |

```bash
curl https://api.thebreeth.com/v1/episodes \
  -H "Authorization: Bearer ck_live_..."
```

Keys are minted in the dashboard at **API Keys → New key**. Plaintext is shown once. Store it like any other secret.

## Scopes [#scopes]

Each API key carries an explicit scope set chosen at mint time:

| Scope                             | Endpoints                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `read` (implicit, always granted) | `GET /v1/episodes/*`, `GET /v1/entities/*`, `POST /v1/search`, `GET /v1/graph/*` |
| `write`                           | `POST /v1/episodes`, `POST /v1/facts`                                            |
| `admin`                           | `POST /v1/retract`, `POST /v1/tasks`, key management                             |

A request to a route whose scope isn't on your key returns `403 missing_scope`.

## Multi-team keys [#multi-team-keys]

A single key can scope to multiple teams (`team_ids: [A, B, C]`). To pick the active team at request time, send:

```
X-Cogram-Team-Id: <team_uuid>
```

If the header isn't sent and the key only scopes one team, that team is used implicitly.

## Errors [#errors]

Every error response is a JSON envelope:

```json
{ "error": "<slug>", "message": "<human-readable>" }
```

Common slugs:

| HTTP | Slug               | Meaning                                                                        |
| ---- | ------------------ | ------------------------------------------------------------------------------ |
| 400  | `invalid_request`  | Bad payload — missing field, wrong type                                        |
| 401  | `unauthenticated`  | Bearer token missing / invalid / expired                                       |
| 402  | `payment_required` | Subscription past-due or cancelled. Writes blocked until resolved.             |
| 403  | `missing_scope`    | Key doesn't carry the scope required for this route                            |
| 429  | `quota_exceeded`   | Monthly cap reached. Response body includes `kind`, `limit`, `current`, `tier` |
| 500  | `internal_error`   | Server fault. Includes a request-id you can quote in support.                  |

## Rate limits [#rate-limits]

Hard caps apply per `(team, billing month)`. See [Tiers & Limits](/docs/tiers-and-limits). There are no per-second rate limits — every write is metered against the monthly counter.

## Idempotency [#idempotency]

`POST /v1/episodes` is **not idempotent**. Calling it twice with the same content creates two episodes. Breeth dedupes entities/edges across them in the graph, but the episode count goes up by two. Build your own idempotency key on top if you need it.

## Versioning [#versioning]

We add new endpoints additively. We do not remove or rename fields without a major-version bump.
 

# POST /v1/episodes (/docs/api/episodes)



Ingest a prose episode. Breeth extracts entities and edges synchronously, then runs narration, profile distillation, and (if you opted in) intent annotation asynchronously.

**Scope required:** `write`

## Request [#request]

```
POST /v1/episodes
Authorization: Bearer ck_live_...
Content-Type: application/json
```

```json
{
  "content": "Nandini Kulkarni shipped the migration in Q1 and was promoted to Staff Engineer.",
  "group_id": "default",
  "source_description": "api",
  "extract_intent": false
}
```

| Field                | Type                | Required         | Notes                                                                                             |
| -------------------- | ------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `content`            | string, ≥ 1 char    | yes              | The prose to ingest.                                                                              |
| `group_id`           | string              | no (`"default"`) | Sub-namespace within your project. Letters, digits, dashes, underscores.                          |
| `source_description` | string, ≤ 120 chars | no (`"api"`)     | Free-form label shown in the dashboard.                                                           |
| `extract_intent`     | bool                | no (`false`)     | Run intent annotation. Counts against monthly intents cap. See [Intents](/docs/concepts/intents). |

## Response — 200 OK [#response--200-ok]

```json
{
  "ok": true,
  "episode_name": "api_1778498269735",
  "extracted": {
    "entities": 4,
    "edges": 3
  },
  "group_id": "default",
  "warning": null,
  "cogram": {
    "mode": "async",
    "status": "pipeline_running_in_background",
    "task_id": "0ef8c19d6381",
    "note": "narrative/profile populate within ~15s"
  },
  "intent_suggestion": null
}
```

| Field                | Meaning                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `episode_name`       | Unique name. Use it with `GET /v1/episodes/{name}` to retrieve the raw content.                                                                                                                 |
| `extracted.entities` | Count of new + updated nodes in the graph.                                                                                                                                                      |
| `extracted.edges`    | Count of new edges. May be `0` for very terse content.                                                                                                                                          |
| `warning`            | Present when entities extracted but no edges (terse content, pronouns, snake\_case predicates).                                                                                                 |
| `cogram.task_id`     | Background pipeline id. Poll `GET /v1/tasks/{task_id}` for narration / profile completion.                                                                                                      |
| `intent_suggestion`  | If you did not pass `extract_intent: true` and the content looks high-signal, this carries `{should_extract, confidence, reason}`. The suggestion is free; acting on it costs an intent credit. |

## Errors [#errors]

| HTTP | Slug               | When                                                                                      |
| ---- | ------------------ | ----------------------------------------------------------------------------------------- |
| 400  | `invalid_request`  | Missing `content` or it's empty                                                           |
| 401  | `unauthenticated`  | Bad / missing Bearer                                                                      |
| 402  | `payment_required` | Subscription past-due                                                                     |
| 403  | `missing_scope`    | Key lacks `write` scope                                                                   |
| 429  | `quota_exceeded`   | Monthly writes cap hit — `kind: "episodes_per_month"`                                     |
| 429  | `quota_exceeded`   | Monthly intents cap hit (only when `extract_intent: true`) — `kind: "intent_extractions"` |

## Examples [#examples]

<Tabs items="['curl', 'Python', 'Node']">
  <Tab value="curl">
    ```bash
    curl -X POST https://api.thebreeth.com/v1/episodes \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "content": "Sridhar prefers async Rust over Go for IO-heavy services.",
        "extract_intent": true
      }'
    ```
  </Tab>

  <Tab value="Python">
    ```python
    import httpx

    r = httpx.post(
        "https://api.thebreeth.com/v1/episodes",
        headers={"Authorization": f"Bearer {KEY}"},
        json={
            "content": "Sridhar prefers async Rust over Go for IO-heavy services.",
            "extract_intent": True,
        },
    )
    r.raise_for_status()
    print(r.json())
    ```
  </Tab>

  <Tab value="Node">
    ```js
    const r = await fetch("https://api.thebreeth.com/v1/episodes", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "Sridhar prefers async Rust over Go for IO-heavy services.",
        extract_intent: true,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    console.log(await r.json());
    ```
  </Tab>
</Tabs>

## Related [#related]

* [`POST /v1/facts`](/docs/api/facts) — write a single subject/predicate/object triple
* [`POST /v1/search`](/docs/api/search) — retrieve facts after writing
* [Episodes concept](/docs/concepts/episodes)

# POST /v1/facts (/docs/api/facts)



Shortcut for writing a single structured fact. Internally this composes a sentence and routes through the same extraction pipeline as [`POST /v1/episodes`](/docs/api/episodes), so the response shape is identical.

**Scope required:** `write`

## Request [#request]

```
POST /v1/facts
Authorization: Bearer ck_live_...
Content-Type: application/json
```

```json
{
  "subject": "Nandini Kulkarni",
  "predicate": "promoted_to",
  "object": "Staff Engineer",
  "group_id": "default",
  "extract_intent": false
}
```

| Field            | Type                | Required         | Notes                                                                             |
| ---------------- | ------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `subject`        | string, ≤ 240 chars | yes              | The actor / source entity                                                         |
| `predicate`      | string, ≤ 120 chars | yes              | The relation. Underscores are converted to spaces when synthesizing the sentence. |
| `object`         | string, ≤ 240 chars | yes              | The target entity                                                                 |
| `group_id`       | string              | no (`"default"`) | Sub-namespace within your project                                                 |
| `extract_intent` | bool                | no (`false`)     | Same semantics as `/v1/episodes`. See [Intents](/docs/concepts/intents).          |

The composed sentence Breeth ingests is:

```
{subject} {predicate-with-spaces} {object}
```

So `predicate: "promoted_to"` becomes "promoted to" inside the prose.

## Response [#response]

Identical shape to [`POST /v1/episodes`](/docs/api/episodes).

## When to use facts vs episodes [#when-to-use-facts-vs-episodes]

| Use `POST /v1/episodes` when…                                             | Use `POST /v1/facts` when…                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| You have natural-language prose (chat turn, journal entry, doc paragraph) | You already have structured S-P-O data and want a fast write path |
| The content carries multiple distinct facts                               | The fact is atomic and you want it written as a single edge       |
| You want intent annotation on rich content                                | You want a minimal-overhead structured ingest                     |

<Callout type="info" title="They land in the same graph">
  There's no semantic distinction in storage. A fact written via `/v1/facts` is indistinguishable from the same fact extracted from prose via `/v1/episodes`.
</Callout>

## Examples [#examples]

<Tabs items="['curl', 'Python', 'Node']">
  <Tab value="curl">
    ```bash
    curl -X POST https://api.thebreeth.com/v1/facts \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "subject": "Sridhar Cheeti",
        "predicate": "prefers",
        "object": "async Rust over Go"
      }'
    ```
  </Tab>

  <Tab value="Python">
    ```python
    r = httpx.post(
        "https://api.thebreeth.com/v1/facts",
        headers={"Authorization": f"Bearer {KEY}"},
        json={
            "subject": "Sridhar Cheeti",
            "predicate": "prefers",
            "object": "async Rust over Go",
        },
    )
    ```
  </Tab>

  <Tab value="Node">
    ```js
    await fetch("https://api.thebreeth.com/v1/facts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Sridhar Cheeti",
        predicate: "prefers",
        object: "async Rust over Go",
      }),
    });
    ```
  </Tab>
</Tabs>
 

# POST /v1/search (/docs/api/search)



Run a hybrid (BM25 + vector + graph traversal) search across the active team and project's memory. Returns ranked edges with attribution.

**Scope required:** `read` (implicit on every key)

## Request [#request]

```
POST /v1/search
Authorization: Bearer ck_live_...
Content-Type: application/json
```

```json
{
  "query": "What does Sridhar think about Rust?",
  "group_id": "default",
  "limit": 10
}
```

| Field      | Type             | Required         | Notes                                      |
| ---------- | ---------------- | ---------------- | ------------------------------------------ |
| `query`    | string, ≥ 1 char | yes              | Natural-language question or keyword list. |
| `group_id` | string           | no (`"default"`) | Sub-namespace within your project.         |
| `limit`    | int, 1–100       | no (`10`)        | Maximum number of edges to return.         |

## Response — 200 OK [#response--200-ok]

```json
{
  "edges": [
    {
      "edge_uuid": "0cb65218-6cfa-4ec6-9802-1b24d6d0cb93",
      "source_node": "Sridhar Cheeti",
      "target_node": "Rust",
      "fact": "Sridhar Cheeti prefers async Rust over Go for IO-heavy services",
      "name": "prefers",
      "intent_meta": {
        "edge_kind": "preference",
        "cognitive_pattern": "cost-vs-quality tradeoff",
        "why_connected": "Tail latency matters more than ramp-up time for this team."
      },
      "_tier": "hot"
    }
  ],
  "_cache": {
    "tier": "hit",
    "hot_hits": 1,
    "cold_hits": 0,
    "group_id": "default"
  }
}
```

| Field                                 | Meaning                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `edges[].fact`                        | Natural-language summary of the relationship.                                                                                               |
| `edges[].source_node` / `target_node` | Entity names involved.                                                                                                                      |
| `edges[].name`                        | Predicate label (e.g. `"prefers"`, `"reports_to"`).                                                                                         |
| `edges[].intent_meta`                 | Present iff the edge was written with `extract_intent: true`. Carries `edge_kind`, `cognitive_pattern`, `why_connected`, `director_vision`. |
| `edges[]._tier`                       | `"hot"` if served from the Valkey active-subgraph cache, `"cold"` if from a fresh Neo4j query.                                              |
| `_cache.tier`                         | `"hit"` / `"warmed"` / `"disabled"`.                                                                                                        |

If your query is subjective ("what do I think about…"), the response also carries `director_profile` — a pre-computed personality / working-style summary distilled from prior writes.

## Behaviour notes [#behaviour-notes]

* Search is scoped to the caller's `(team, project)` automatically. You cannot escape the partition.
* The `group_id` field narrows the search **within** your project; it doesn't relax the tenancy boundary.
* Hybrid ranking: BM25 + vector cosine + graph centrality. The exact weights are tuned per result type; semantic queries lean on vectors, exact-name queries lean on BM25.

## Errors [#errors]

| HTTP | Slug              | When                                              |
| ---- | ----------------- | ------------------------------------------------- |
| 400  | `invalid_request` | Missing `query`                                   |
| 401  | `unauthenticated` | Bad Bearer                                        |
| 429  | `quota_exceeded`  | Monthly retrievals cap hit — `kind: "retrievals"` |

## Examples [#examples]

<Tabs items="['curl', 'Python', 'Node']">
  <Tab value="curl">
    ```bash
    curl -X POST https://api.thebreeth.com/v1/search \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      -d '{"query": "What does Sridhar think about Rust?", "limit": 5}'
    ```
  </Tab>

  <Tab value="Python">
    ```python
    r = httpx.post(
        "https://api.thebreeth.com/v1/search",
        headers={"Authorization": f"Bearer {KEY}"},
        json={"query": "What does Sridhar think about Rust?", "limit": 5},
    )
    for e in r.json()["edges"]:
        print(f"{e['source_node']} -[{e['fact']}]→ {e['target_node']}")
    ```
  </Tab>

  <Tab value="Node">
    ```js
    const r = await fetch("https://api.thebreeth.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "What does Sridhar think about Rust?", limit: 5 }),
    });
    const { edges } = await r.json();
    edges.forEach(e => console.log(e.fact));
    ```
  </Tab>
</Tabs>

## Related [#related]

* [`POST /v1/episodes`](/docs/api/episodes) — write
* [`POST /v1/retract`](/docs/api/retract) — remove an edge from results
* [Knots](/docs/concepts/knots) — pre-synthesized narratives that appear inline on hub entities
 

# GET /v1/graph/* (/docs/api/graph)



The graph endpoints split the team's memory graph into two layers:

* A **light skeleton** that paints the canvas — every node, every edge, but only the fields a renderer needs (uuid, name, labels, degree, cognitive pattern).
* A **rich per-node detail** payload — summary, knot narrative, neighbours with full `intent_meta`, mentioning episodes — fetched lazily when the user focuses a node.

The list endpoints stream as **NDJSON** so the canvas paints incrementally as rows arrive; the per-node endpoint returns plain JSON.

**Scope required:** `read` (implicit on every key)

***

## GET /v1/graph/nodes [#get-v1graphnodes]

NDJSON stream of light node skeletons. One JSON object per line, sentinel as the last line.

```
GET /v1/graph/nodes?query=&limit=2000&offset=0
Authorization: Bearer ck_live_...
```

| Query param | Type         | Default | Notes                                                                   |
| ----------- | ------------ | ------- | ----------------------------------------------------------------------- |
| `query`     | string       | `""`    | Case-insensitive substring filter on `name`.                            |
| `limit`     | int, 1–50000 | `2000`  | Hard cap is 50K rows per request. Page with `offset` for larger graphs. |
| `offset`    | int, ≥ 0     | `0`     | Skip the first N rows (sorted by degree descending).                    |

### Response — 200 OK · `application/x-ndjson` [#response--200-ok--applicationx-ndjson]

Each line is one of:

```json
{"u":"a7b1…","n":"Sridhar","l":["Person"],"d":12,"k":1,"ks":47.3}
{"u":"d04e…","n":"Rust","l":["Tech"],"d":8,"k":0,"ks":null}
…
{"_end": 38}
```

| Field  | Meaning                                                             |
| ------ | ------------------------------------------------------------------- |
| `u`    | Entity uuid.                                                        |
| `n`    | Entity name (canonical id for force-graph rendering).               |
| `l`    | Labels, excluding the base `Entity` label.                          |
| `d`    | Degree — total connected edges (in + out, undirected).              |
| `k`    | `1` if the entity is a knot (has been through synthesis), else `0`. |
| `ks`   | Knot score (`null` for non-knots).                                  |
| `_end` | Sentinel on the final line. Carries the row count.                  |

***

## GET /v1/graph/links [#get-v1graphlinks]

NDJSON stream of light edges.

```
GET /v1/graph/links?include_retracted=false&limit=5000&offset=0
Authorization: Bearer ck_live_...
```

| Query param         | Type          | Default | Notes                                                        |
| ------------------- | ------------- | ------- | ------------------------------------------------------------ |
| `include_retracted` | bool          | `false` | Set `true` to include edges with `retracted_at IS NOT NULL`. |
| `limit`             | int, 1–100000 | `5000`  | Hard cap 100K per request.                                   |
| `offset`            | int, ≥ 0      | `0`     | Page through larger result sets.                             |

### Response — 200 OK · `application/x-ndjson` [#response--200-ok--applicationx-ndjson-1]

```json
{"u":"e1c8…","s":"Sridhar","t":"Rust","p":"preference","r":0}
{"u":"f7a2…","s":"Sridhar","t":"Go","p":"preference","r":0}
…
{"_end": 412}
```

| Field  | Meaning                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------- |
| `u`    | Edge uuid.                                                                                      |
| `s`    | Source entity name.                                                                             |
| `t`    | Target entity name.                                                                             |
| `p`    | `cognitive_pattern` from the edge's `intent_meta` (`null` if the edge wasn't intent-annotated). |
| `r`    | `1` if retracted, else `0`.                                                                     |
| `_end` | Sentinel — row count.                                                                           |

`why_connected`, `director_vision`, and `edge_kind` are **not** in this payload — fetch them via `/v1/graph/nodes/{name}/details` when the user focuses a node.

***

## GET /v1/graph/nodes/\{name}/details [#get-v1graphnodesnamedetails]

Rich payload for a single entity: the entity itself, every neighbour with full `intent_meta`, and the mentioning episodes. Fired on canvas-node click.

```
GET /v1/graph/nodes/Sridhar/details
Authorization: Bearer ck_live_...
```

Name is URL-encoded. Names are unique within `(team, project)`, so this is a single-row lookup.

### Response — 200 OK · `application/json` [#response--200-ok--applicationjson]

```json
{
  "entity": {
    "uuid": "a7b1…",
    "name": "Sridhar",
    "labels": ["Person"],
    "summary": "Founder of Breeth. Backend leaning, ships fast.",
    "edge_count": 12,
    "episode_count": 24,
    "space": "individual",
    "member_id": null,
    "created_at": "2025-12-04T18:22:10Z",
    "knot_narrative": "Sridhar is the founder-engineer hub …",
    "knot_score": 47.3,
    "knot_synthesized_at": 1746012345.1,
    "knot_model": "anthropic/claude-haiku-4.5"
  },
  "neighbors": [
    {
      "peer": "Rust",
      "direction": "out",
      "fact": "Sridhar prefers async Rust over Go for IO-heavy services",
      "cognitive_pattern": "preference",
      "intent_meta": {
        "edge_kind": "preference",
        "cognitive_pattern": "preference",
        "why_connected": "Tail latency matters more than ramp-up time.",
        "director_vision": "Bet on languages with strong async stories for v1."
      },
      "edge_uuid": "e1c8…"
    }
  ],
  "episodes": [
    { "uuid": "ep_…", "name": "api_1778775104758", "valid_at": "2026-05-13T22:15:04Z" }
  ]
}
```

| Field                     | Meaning                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity.knot_*`           | Populated only when this entity is a knot. `knot_narrative` is the pre-synthesized one-paragraph framing — rendered inline; zero live LLM cost. |
| `neighbors[].direction`   | `"out"` means `entity → peer`; `"in"` means `peer → entity`.                                                                                    |
| `neighbors[].intent_meta` | All four intent fields are present when the edge was written with intent extraction. Older / un-annotated edges return `null`.                  |
| `episodes[]`              | The top mentioning episodes (capped at \~20).                                                                                                   |

### Errors [#errors]

| HTTP | Slug        | When                                                        |
| ---- | ----------- | ----------------------------------------------------------- |
| 404  | `not_found` | No entity with this name in the caller's `(team, project)`. |

***

## Streaming clients [#streaming-clients]

### curl — print rows as they land [#curl--print-rows-as-they-land]

```bash
curl -sN https://api.thebreeth.com/v1/graph/nodes \
  -H "Authorization: Bearer $KEY"
```

`-N` disables curl's output buffering; otherwise you only see the stream after the connection closes.

### Python — incremental parse [#python--incremental-parse]

```python
import httpx, json

with httpx.stream(
    "GET",
    "https://api.thebreeth.com/v1/graph/nodes",
    headers={"Authorization": f"Bearer {KEY}"},
    timeout=None,
) as r:
    for line in r.iter_lines():
        if not line:
            continue
        row = json.loads(line)
        if "_end" in row:
            print(f"done — {row['_end']} nodes")
            break
        print(row["n"], "deg", row["d"])
```

### Node / browser — Web Streams API [#node--browser--web-streams-api]

```ts
const res = await fetch("/api/graph/nodes", {
  headers: { Authorization: `Bearer ${KEY}` },
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buf = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx: number;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    const row = JSON.parse(line);
    if ("_end" in row) continue;
    onNode(row); // paint immediately
  }
}
```

***

## Scaling notes [#scaling-notes]

* **Compact field names** (`u`/`n`/`l`/`d`/`k`/`ks`) cut wire size \~25% vs the legacy `/v1/graph/entities` payload. Drop the prose (`summary`, `knot_narrative`, `intent_meta.why_connected`) from the list to keep that budget intact at canvas scale.
* **No layout precompute** — clients run their own force-directed simulation. For graphs > 1.5K nodes, switch to a WebGL renderer (Cosmograph etc.); the wire format is unchanged.
* **Per-node detail is cached** in the dashboard via an in-memory `Map<name, NodeDetails>` so the inspector's "Show details" expansion never re-fetches the same node.

## Legacy endpoints [#legacy-endpoints]

`GET /v1/graph/{entities,edges,episodes}` (regular JSON arrays, no streaming) remain available. They predate the v2 split and ship the full prose payload. Prefer the streamed endpoints above for any new integration; the legacy routes will receive no further enhancements.

## Related [#related]

* [Concepts → Knots](/docs/concepts/knots) — how `knot_*` fields are produced
* [Concepts → Intents](/docs/concepts/intents) — what `intent_meta` carries
* [`POST /v1/search`](/docs/api/search) — hybrid retrieval (returns edges with `intent_meta` inline)
 
# POST /v1/retract (/docs/api/retract)



Marks an edge as retracted. After retraction, the edge is excluded from `POST /v1/search` results but the row remains in Neo4j with a `retracted_at` timestamp — so you keep the audit trail and can un-retract later.

**Scope required:** `admin`

## Request [#request]

```
POST /v1/retract
Authorization: Bearer ck_live_...
Content-Type: application/json
```

```json
{
  "edge_uuid": "0cb65218-6cfa-4ec6-9802-1b24d6d0cb93",
  "reason": "Source recanted in follow-up conversation"
}
```

| Field       | Type          | Required | Notes                                           |
| ----------- | ------------- | -------- | ----------------------------------------------- |
| `edge_uuid` | string (uuid) | yes      | The `edge_uuid` from a prior search response    |
| `reason`    | string        | no       | Free-form audit note attached to the retraction |

## Response — 200 OK [#response--200-ok]

```json
{
  "ok": true,
  "edge_uuid": "0cb65218-6cfa-4ec6-9802-1b24d6d0cb93",
  "retracted_at": "2026-05-11T11:42:08Z"
}
```

## Hard vs soft delete [#hard-vs-soft-delete]

`/v1/retract` is **soft**. The edge survives in the graph; future searches just skip it. To hard-delete an edge (for legal compliance reasons), contact support — there's no public endpoint for permanent removal.

## Errors [#errors]

| HTTP | Slug              | When                                                           |
| ---- | ----------------- | -------------------------------------------------------------- |
| 400  | `invalid_request` | Missing or malformed `edge_uuid`                               |
| 401  | `unauthenticated` | Bad Bearer                                                     |
| 403  | `missing_scope`   | Key lacks `admin` scope                                        |
| 404  | `not_found`       | Edge doesn't exist or belongs to a different `(team, project)` |

<Callout type="warn" title="Cross-team retraction is forbidden">
  A key can only retract edges in its own `(team, project)`. Attempting to retract an edge from outside that partition returns 404 — never a 403, so the existence of foreign edges isn't leaked.
</Callout>

## Examples [#examples]

<Tabs items="['curl', 'Python', 'Node']">
  <Tab value="curl">
    ```bash
    curl -X POST https://api.thebreeth.com/v1/retract \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      -d '{"edge_uuid": "0cb65218-...", "reason": "Source recanted"}'
    ```
  </Tab>

  <Tab value="Python">
    ```python
    r = httpx.post(
        "https://api.thebreeth.com/v1/retract",
        headers={"Authorization": f"Bearer {KEY}"},
        json={"edge_uuid": "0cb65218-...", "reason": "Source recanted"},
    )
    ```
  </Tab>

  <Tab value="Node">
    ```js
    await fetch("https://api.thebreeth.com/v1/retract", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ edge_uuid: "0cb65218-...", reason: "Source recanted" }),
    });
    ```
  </Tab>
</Tabs>
 

# API Keys (/docs/api/api-keys)



API keys are how agents and scripts authenticate to Breeth. Every key is bound to a `(team, project)` at mint time and inherits the role of the member who created it.

Manage keys in the dashboard at [thebreeth.com/app/api-keys](https://www.thebreeth.com/app/api-keys). The endpoints here are for advanced flows; most users mint and rotate from the UI.

## Anatomy [#anatomy]

A minted key looks like:

```
ck_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The `ck_live_` prefix identifies it as a Breeth live-mode key. The remainder is the secret. **Only the hash is stored** — Breeth cannot recover plaintext after creation, so save it the moment you mint it.

## Scopes [#scopes]

Each key carries an explicit scope set:

| Scope             | Powers                                |
| ----------------- | ------------------------------------- |
| `read` (implicit) | Search, get episodes/entities/profile |
| `write`           | Add episodes, record facts            |
| `admin`           | Retract edges, manage other keys      |

Pick the minimum set for the use case. A read-only widget should never carry `write`.

## Project scoping [#project-scoping]

Every key targets exactly one project. When a key writes, the resulting nodes / edges land in that project's partition and never leak. To work across multiple projects in the same team, mint one key per project.

## Expiry (hackathons & trials) [#expiry-hackathons--trials]

Keys can carry an `expires_at`. After the timestamp, the key behaves like a revoked key — 401 on every call. Used by the hackathon flow to issue time-limited tokens to event participants.

## Endpoints [#endpoints]

The REST surface is read-only; mint and delete via the dashboard.

### `GET /v1/api_keys` [#get-v1api_keys]

List keys visible to the caller.

```json
[
  {
    "id": "efc3abb3-77b9-4495-9e32-0acbedd5b49b",
    "name": "ingestion-bot",
    "key_prefix": "ck_live_VmbO",
    "scopes": ["write"],
    "expires_at": null,
    "created_at": "2026-05-10T03:42:11Z",
    "last_used_at": "2026-05-11T11:17:57Z",
    "revoked_at": null
  }
]
```

Note `key_prefix` only — plaintext is never returned. Use it to identify which key is which.

## Best practice [#best-practice]

* **One key per integration.** Don't share a single key across Claude Desktop, your CI, and your production agent. Different keys give you different revoke surfaces.
* **Rotate at least annually.** Mint a new key, deploy, verify, revoke the old.
* **Scope tight.** A monitor reading the graph should never have `admin`.
* **Treat them like Stripe secret keys.** Don't commit them; use environment variables; redact them from logs.

## Revocation [#revocation]

Revoke a key from the dashboard. Effect is immediate — within seconds, every subsequent request with that key returns 401. Existing in-flight requests complete normally.
 


api keys are inside key.md




https://www.npmjs.com/package/@breeth/sdk

# Node.js SDK (/docs/sdks/node)



`@breeth/sdk` is a thin TypeScript fetch wrapper around the [Breeth REST API](/docs/api/overview). Built for Node 18+, ESM + CJS dual build, zero runtime dependencies (uses the global `fetch`).

## Install [#install]

```bash
npm install @breeth/sdk
```

Works with pnpm, yarn, bun the same way.

## Quickstart [#quickstart]

```ts
import { BreethClient } from '@breeth/sdk';

const client = new BreethClient({ apiKey: process.env.BREETH_API_KEY! });

// Write
await client.write({
  content: "Sridhar prefers async Rust over Go for IO-heavy services.",
  groupId: 'default',
  extractIntent: true,
});

// Retrieve
const hits = await client.retrieve({
  query: "What language does Sridhar prefer?",
  groupId: 'default',
  limit: 5,
});

console.log(hits.edges);
```

## Constructor [#constructor]

```ts
new BreethClient({
  apiKey: string;            // required — ck_live_… from /app/api-keys
  baseUrl?: string;          // default 'https://api.thebreeth.com'
  fetch?: typeof fetch;      // override (testing / custom transport)
});
```

## Methods [#methods]

### `client.write(opts)` [#clientwriteopts]

Write an episode. Returns the episode id and pipeline status.

```ts
const res = await client.write({
  content: "Decision: switching to gRPC for the inference service.",
  groupId: 'default',
  sourceDescription: 'api',
  extractIntent: false,
});
res.episode_name;     // 'api_1778…'
res.extracted.entities;
res.cogram?.mode;     // 'sync' | 'async'
```

| Param               | Type       | Notes                                                                          |
| ------------------- | ---------- | ------------------------------------------------------------------------------ |
| `content`           | `string`   | The text to memorize.                                                          |
| `groupId`           | `string?`  | Defaults to `'default'`. Scopes the write to a graph partition.                |
| `sourceDescription` | `string?`  | Free-text label for where this episode came from.                              |
| `extractIntent`     | `boolean?` | Opt-in heuristic+LLM intent extraction. See [intents](/docs/concepts/intents). |

### `client.retrieve(opts)` [#clientretrieveopts]

Hybrid BM25 + vector + graph search. Returns ranked edges with attribution.

```ts
const res = await client.retrieve({
  query: "What did Sridhar say about gRPC?",
  groupId: 'default',
  limit: 10,
});
for (const e of res.edges) {
  console.log(e.fact, e.confidence);
}
```

### `client.entity(name, opts?)` [#cliententityname-opts]

"Tell me about X" — fetches narrative + edges + episodes for an entity (substring match on name, UUID also accepted).

```ts
const view = await client.entity("Sridhar", { mode: 'all', limit: 20 });
```

### `client.groups(opts?)` [#clientgroupsopts]

List graph partitions in the team scope.

```ts
const { groups, total } = await client.groups({ limit: 20 });
```

### Graph reads [#graph-reads]

```ts
const ents = await client.graph.listEntities({ limit: 20 });
const edges = await client.graph.listEdges({ limit: 20 });
const eps = await client.graph.listEpisodes({ limit: 20 });
const details = await client.graph.nodeDetails(entityUuidOrName);
```

## Error handling [#error-handling]

Non-2xx responses throw `BreethError`:

```ts
import { BreethError } from '@breeth/sdk';

try {
  await client.write({ content: '' });
} catch (e) {
  if (e instanceof BreethError) {
    console.error(e.status);   // 422
    console.error(e.slug);     // 'validation_error'
    console.error(e.body);     // server response body
  }
}
```

| Status | Meaning                                                 |
| ------ | ------------------------------------------------------- |
| `401`  | `slug: 'invalid_token'` — API key invalid or revoked    |
| `402`  | Payment required — past-due subscription                |
| `403`  | Scope insufficient (e.g. retract on a `write`-only key) |
| `404`  | Entity / episode not found                              |
| `422`  | Validation error — see `body` for the offending field   |
| `429`  | Rate limit (per-team or per-group)                      |

## End-user (B2B2C) pass-through [#end-user-b2b2c-pass-through]

If you're calling Breeth on behalf of *your* users (and want per-end-user attribution / rate limiting), pass `endUserId` per call:

```ts
await client.write({ content: '…' }, { endUserId: 'user-42' });
```

The SDK forwards it as `X-End-User-Id`. Server-side, Breeth tags writes and applies the end-user's rate budget.

## TypeScript types [#typescript-types]

Every method is fully typed. Hover in your editor or `import type` directly:

```ts
import type {
  WriteResponse,
  RetrieveResponse,
  EntityResponse,
  GraphEntityListResponse,
  NodeDetailsResponse,
} from '@breeth/sdk';
```

## License + source [#license--source]

MIT. Source: [github.com/Gramies/cogram-sdk-node](https://github.com/Gramies/cogram-sdk-node). Issues + PRs welcome.


# SDKs overview (/docs/sdks/overview)



Breeth ships official SDKs in two languages. Both are thin wrappers around the [REST API](/docs/api/overview) — same endpoints, same auth, idiomatic types.

<Cards>
  <Card title="Node.js" href="/docs/sdks/node" description="@breeth/sdk · ESM + CJS · zero runtime deps · TypeScript types built in." />

  <Card title="Python" href="/docs/sdks/python" description="breeth · sync + async clients · Pydantic types · httpx under the hood." />
</Cards>

## When to use an SDK vs raw REST [#when-to-use-an-sdk-vs-raw-rest]

| Use an SDK if                                     | Use raw REST if                              |
| ------------------------------------------------- | -------------------------------------------- |
| You're building in Node or Python                 | You're in another language (Go, Rust, Ruby…) |
| You want typed responses                          | You want zero dependencies                   |
| You'd rather not write your own retry/error class | You have your own HTTP layer                 |

The SDKs cover every public endpoint. If you want a feature the SDK doesn't expose, [open an issue](https://github.com/Gramies/cogram-sdk-node/issues) and we'll add it — the API surface is small and we keep parity.

## Versioning [#versioning]

Both SDKs follow [SemVer](https://semver.org). Major version bumps are reserved for breaking changes; minor for additive endpoints; patch for fixes. The 0.x line is pre-1.0 — small breaking changes are still possible if we find them quickly.

## Authentication [#authentication]

Both SDKs accept the same `ck_live_…` API keys you mint at [thebreeth.com/app/api-keys](https://www.thebreeth.com/app/api-keys). They can also read the key from an environment variable, so you don't have to hand-pass it.

```ts
// Node
const client = new BreethClient({ apiKey: process.env.BREETH_API_KEY! });
```

```python
# Python — env-var auto-read
client = BreethClient()
```

## Source code [#source-code]

Both SDKs are MIT-licensed. Source:

* Node: [github.com/Gramies/cogram-sdk-node](https://github.com/Gramies/cogram-sdk-node)
* Python: [github.com/Gramies/cogram-sdk-python](https://github.com/Gramies/cogram-sdk-python)
 
