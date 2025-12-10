import express from "express";
import cors from "cors";

import ItemRoute from "./routes/itemRoute.js";
import AiRoute from "./routes/aiRoute.js";

const app = express();

// body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// allow request from other origin (Frontend which is at different port)
app.use(cors());

// use routes
app.use("/questions", ItemRoute);
app.use("/api", AiRoute);

export default app;
