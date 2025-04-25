// routes/boards.js
import express from "express";
import { getBoards, saveBoards } from "../controllers/boardController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/api/boards", auth, getBoards);
router.post("/api/boards", auth, saveBoards);

export default router;
