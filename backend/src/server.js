const express = require("express");
const cors = require("cors");
const { solvePathfinding } = require("./solver");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "pathfinding-api" });
});

app.post("/api/pathfind", (req, res) => {
  try {
    const { grid, start, end, algorithm, allowDiagonal } = req.body || {};

    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
      return res.status(400).json({ error: "Invalid grid format." });
    }

    const cols = grid[0].length;
    const isRectangular = grid.every((row) => Array.isArray(row) && row.length === cols);

    if (!isRectangular) {
      return res.status(400).json({ error: "Grid rows must have equal length." });
    }

    if (!start || !end || typeof start.row !== "number" || typeof start.col !== "number" || typeof end.row !== "number" || typeof end.col !== "number") {
      return res.status(400).json({ error: "Start and end nodes are required." });
    }

    const result = solvePathfinding({
      grid,
      start,
      end,
      algorithm,
      allowDiagonal: Boolean(allowDiagonal)
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Pathfinding backend running on http://localhost:${PORT}`);
});
