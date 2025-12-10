import express from "express";

import { generateLLM } from "../controllers/aiController.js";

const router = express.Router();

router.post("/llm", generateLLM);
// router.post("/image", generateImage);

export default router;
