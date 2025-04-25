// routes/boards.js
import express from "express";
import { getBoards, saveBoards } from "../controllers/boardController.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

router.get("/api/boards", authenticateToken, getBoards);
router.post("/api/boards", authenticateToken, saveBoards);

export default router;
