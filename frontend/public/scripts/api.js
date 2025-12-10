import { BACKEND_URL } from "./config.js";

async function handle(res, label) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${label} ${res.status} ${text || ""}`.trim());
  }
  return res.json();
}

export async function getItems() {
  const r = await fetch(`${BACKEND_URL}/questions`);
  // console.log("Getting items");
  return handle(r, "GET /questions");
}

export async function createItem(item) {
  const r = await fetch(`${BACKEND_URL}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return handle(r, "POST /questions"); // <-- returns the CREATED doc (with _id)
}

export async function deleteItem(id) {
  const r = await fetch(`${BACKEND_URL}/questions/${id}`, { method: "DELETE" });
  return handle(r, "DELETE /questions/:id");
}

export async function loadItem(id) {
  const r = await fetch(`${BACKEND_URL}/questions/${id}`);
  return handle(r, "GET /questions/:id");
}

export async function updateItem(id, item) {
  const r = await fetch(`${BACKEND_URL}/questions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return handle(r, "PUT /questions/:id");
}

export async function generateLLM(data) {
  const res = await fetch(`${BACKEND_URL}/api/llm`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  })
  return handle(res, "POST /api/llm");
}

// export async function generateImage(data) {
//   const res = await fetch(`${BACKEND_URL}/api/image`, {
//     method: "POST",
//     headers: {"Content-Type": "application/json"},
//     body: JSON.stringify({prompt: data})
//   })
//   return handle(res, "POST /api/image");
// }