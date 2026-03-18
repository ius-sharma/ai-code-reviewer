import express from "express";
import {
  analyzeCode,
  chatCode,
  explainCode,
} from "../controllers/analyze.controller.js";

const router = express.Router();

router.get("/analyze-code", (req, res) => {
  res.json({
    success: true,
    message: "API working",
  });
});

router.post("/analyze-code", analyzeCode);
router.post("/explain-code", explainCode);
router.post("/chat-code", chatCode);

export default router;
