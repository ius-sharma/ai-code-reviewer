import "dotenv/config";
import express from "express";
import cors from "cors";

import analyzeRoutes from "./routes/analyze.route.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "5000", 10);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", analyzeRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  // Handle malformed JSON payloads from express.json().
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body.",
    });
  }

  // Handle oversized request bodies.
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large.",
    });
  }

  const status =
    typeof error?.status === "number" && error.status >= 400
      ? error.status
      : 500;

  const message =
    status >= 500
      ? "Internal server error."
      : typeof error?.message === "string" && error.message.trim()
        ? error.message
        : "Request failed.";

  return res.status(status).json({
    success: false,
    message,
  });
});

app.listen(Number.isNaN(port) ? 5000 : port, () => {
  console.log(`Server running on port ${Number.isNaN(port) ? 5000 : port}`);
});
