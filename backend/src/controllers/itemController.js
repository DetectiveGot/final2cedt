import Item from "../models/itemModel.js";

// GET /questions
export async function getItems(req, res) {
  try {
    const docs = await Item.find().lean(); // safe here
    return res.json(docs);                 // [{ _id, title, questions, results }, ...]
  } catch (err) {
    console.error("getItems error:", err);
    return res.status(500).json({ message: "server error" });
  }
}

// POST /questions
export async function createItem(req, res) {
  try {
    const { title, questions, results } = req.body;
    if (!title) return res.status(400).json({ message: "title required" });
    const doc = await Item({
      title,
      questions: questions ?? { emotion: [], appearance: [] },
      results: results ?? [],
    });
    doc.save();

    return res.status(201).json(doc); // has _id
  } catch (err) {
    console.error("createItem error:", err);
    return res.status(500).json({ message: "server error" });
  }
}

// PUT /questions/:id
export async function updateItem(req, res) {
  // console.log(req.body);
  try {
    const { id } = req.params;
    const { title, questions, results } = req.body;

    const doc = await Item.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title !== undefined ? { title } : {}),
          ...(questions !== undefined ? { questions } : {}),
          ...(results !== undefined ? { results } : {}),
        },
      },
      { new: true, runValidators: true } // don't use .lean() here
    );

    if (!doc) return res.status(404).json({ message: "not found" });
    return res.json(doc);
  } catch (err) {
    if (err?.name === "CastError") {
      return res.status(400).json({ message: "invalid id" });
    }
    console.error("updateItem error:", err);
    return res.status(500).json({ message: "server error" });
  }
}

// DELETE /questions/:id
export async function deleteItem(req, res) {
  try {
    const { id } = req.params;
    const doc = await Item.findByIdAndDelete(id); // no .lean()
    if (!doc) return res.status(404).json({ message: "not found" });
    return res.json({ ok: true });
  } catch (err) {
    if (err?.name === "CastError") {
      return res.status(400).json({ message: "invalid id" });
    }
    console.error("deleteItem error:", err);
    return res.status(500).json({ message: "server error" });
  }
}

// GET /questions/:id
export async function loadItem(req, res) {
  try {
    const { id } = req.params;
    const doc = await Item.findById(id).lean(); // fine to lean here
    if (!doc) return res.status(404).json({ message: "not found" });
    return res.json(doc);
  } catch (err) {
    if (err?.name === "CastError") {
      return res.status(400).json({ message: "invalid id" });
    }
    console.error("loadItem error:", err);
    return res.status(500).json({ message: "server error" });
  }
}