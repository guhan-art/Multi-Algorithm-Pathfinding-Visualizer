import { useEffect, useMemo, useRef, useState } from "react";
import { solvePathfinding } from "./solverClient";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_PATH = "/api/pathfind";

function getApiCandidates() {
  if (API_BASE_URL) {
    return [`${API_BASE_URL}${API_PATH}`];
  }

  const candidates = [API_PATH, "http://localhost:5000/api/pathfind"];
  return [...new Set(candidates)];
}

const TOOL = {
  WALL: "wall",
  ERASE: "erase",
  START: "start",
  END: "end"
};

const ALGORITHMS = [
  { label: "A*", value: "astar" },
  { label: "Dijkstra", value: "dijkstra" },
  { label: "Breadth-First Search", value: "bfs" },
  { label: "Depth-First Search", value: "dfs" },
  { label: "Greedy Best-First", value: "greedy" }
];

const THEMES = [
  { label: "Bright", value: "bright" },
  { label: "Dark", value: "dark" },
  { label: "Purple", value: "purple" },
  { label: "Orange", value: "orange" }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeGrid(rows, cols, start, end) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      if (row === start.row && col === start.col) {
        return "start";
      }
      if (row === end.row && col === end.col) {
        return "end";
      }
      return "empty";
    })
  );
}

function clearVisualization(grid) {
  return grid.map((row) =>
    row.map((cell) => {
      if (cell === "visited" || cell === "path") {
        return "empty";
      }
      return cell;
    })
  );
}

function toNumericGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell === "wall" ? 1 : 0)));
}

function App() {
  const [rows, setRows] = useState(18);
  const [cols, setCols] = useState(32);
  const [start, setStart] = useState({ row: 4, col: 5 });
  const [end, setEnd] = useState({ row: 13, col: 24 });
  const [tool, setTool] = useState(TOOL.WALL);
  const [algorithm, setAlgorithm] = useState("astar");
  const [allowDiagonal, setAllowDiagonal] = useState(false);
  const [speed, setSpeed] = useState(12);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Design a maze and run an algorithm.");
  const [stats, setStats] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("pf-theme") || "bright");
  const isPointerDownRef = useRef(false);

  const [grid, setGrid] = useState(() => makeGrid(rows, cols, start, end));

  const cellSize = useMemo(() => {
    if (cols >= 45) return 14;
    if (cols >= 35) return 16;
    return 20;
  }, [cols]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("pf-theme", theme);
  }, [theme]);

  const rebuildGrid = (newRows, newCols) => {
    const safeStart = {
      row: Math.min(start.row, newRows - 1),
      col: Math.min(start.col, newCols - 1)
    };
    const safeEnd = {
      row: Math.min(end.row, newRows - 1),
      col: Math.min(end.col, newCols - 1)
    };

    setStart(safeStart);
    setEnd(safeEnd);
    setGrid(makeGrid(newRows, newCols, safeStart, safeEnd));
  };

  const handleResize = (nextRows, nextCols) => {
    const clampedRows = Math.max(8, Math.min(35, Number(nextRows)));
    const clampedCols = Math.max(10, Math.min(60, Number(nextCols)));
    setRows(clampedRows);
    setCols(clampedCols);
    rebuildGrid(clampedRows, clampedCols);
    setStats(null);
    setStatus("Grid resized. Draw walls and test again.");
  };

  const paintCell = (row, col) => {
    if (isRunning) return;

    setGrid((prev) => {
      const next = clearVisualization(prev).map((line) => [...line]);
      const cell = next[row][col];

      if (tool === TOOL.WALL) {
        if (cell !== "start" && cell !== "end") {
          next[row][col] = "wall";
        }
      }

      if (tool === TOOL.ERASE) {
        if (cell !== "start" && cell !== "end") {
          next[row][col] = "empty";
        }
      }

      if (tool === TOOL.START) {
        next[start.row][start.col] = "empty";
        if (next[row][col] === "end") {
          next[end.row][end.col] = "empty";
          setEnd({ row: Math.max(0, row - 1), col });
          next[Math.max(0, row - 1)][col] = "end";
        }
        next[row][col] = "start";
        setStart({ row, col });
      }

      if (tool === TOOL.END) {
        next[end.row][end.col] = "empty";
        if (next[row][col] === "start") {
          next[start.row][start.col] = "empty";
          setStart({ row: Math.min(rows - 1, row + 1), col });
          next[Math.min(rows - 1, row + 1)][col] = "start";
        }
        next[row][col] = "end";
        setEnd({ row, col });
      }

      return next;
    });
  };

  const handleCellPointerDown = (row, col) => {
    if (isRunning) return;
    isPointerDownRef.current = true;
    paintCell(row, col);
  };

  const handleCellPointerEnter = (row, col) => {
    if (isRunning || !isPointerDownRef.current) return;
    if (tool === TOOL.WALL || tool === TOOL.ERASE) {
      paintCell(row, col);
    }
  };

  const stopDrawing = () => {
    isPointerDownRef.current = false;
  };

  const randomMaze = () => {
    if (isRunning) return;
    setGrid((prev) =>
      clearVisualization(prev).map((row, r) =>
        row.map((cell, c) => {
          if ((r === start.row && c === start.col) || (r === end.row && c === end.col)) {
            return r === start.row && c === start.col ? "start" : "end";
          }
          return Math.random() < 0.28 ? "wall" : "empty";
        })
      )
    );
    setStatus("Random maze generated.");
    setStats(null);
  };

  const resetGrid = () => {
    if (isRunning) return;
    setGrid(makeGrid(rows, cols, start, end));
    setStatus("Grid reset.");
    setStats(null);
  };

  const animateResult = async (visitedOrder, path) => {
    for (const node of visitedOrder) {
      if ((node.row === start.row && node.col === start.col) || (node.row === end.row && node.col === end.col)) {
        continue;
      }
      await wait(speed);
      setGrid((prev) => {
        const next = prev.map((line) => [...line]);
        if (next[node.row][node.col] !== "start" && next[node.row][node.col] !== "end") {
          next[node.row][node.col] = "visited";
        }
        return next;
      });
    }

    for (const node of path) {
      if ((node.row === start.row && node.col === start.col) || (node.row === end.row && node.col === end.col)) {
        continue;
      }
      await wait(Math.max(8, speed / 2));
      setGrid((prev) => {
        const next = prev.map((line) => [...line]);
        if (next[node.row][node.col] !== "start" && next[node.row][node.col] !== "end") {
          next[node.row][node.col] = "path";
        }
        return next;
      });
    }
  };

  const runAlgorithm = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStats(null);
    setStatus("Computing route...");
    setGrid((prev) => clearVisualization(prev));
    let lastFetchError = null;

    try {
      const requestPayload = {
        grid: toNumericGrid(grid),
        start,
        end,
        algorithm,
        allowDiagonal
      };

      const payload = JSON.stringify(requestPayload);

      let data;
      let usedBrowserFallback = false;

      for (const apiUrl of getApiCandidates()) {
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: payload
          });

          const raw = await response.text();
          let parsed = null;

          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = null;
          }

          if (!response.ok) {
            throw new Error(parsed?.error || `Backend error (${response.status}).`);
          }

          if (!parsed) {
            throw new Error("Backend returned an invalid response.");
          }

          data = parsed;
          break;
        } catch (fetchError) {
          lastFetchError = fetchError;
        }
      }

      if (!data) {
        data = solvePathfinding(requestPayload);
        usedBrowserFallback = true;
      }

      await animateResult(data.visitedOrder || [], data.path || []);
      setStats(data.stats || null);

      if (data.found) {
        setStatus(`Path found with ${data.path.length} nodes.${usedBrowserFallback ? " (Browser mode)" : ""}`);
      } else {
        setStatus(`No path found. Try reducing walls or enabling diagonals.${usedBrowserFallback ? " (Browser mode)" : ""}`);
      }
    } catch (error) {
      // Defensive path: if any parse/syntax issue escapes network handling, still visualize in-browser.
      try {
        const fallbackData = solvePathfinding({
          grid: toNumericGrid(grid),
          start,
          end,
          algorithm,
          allowDiagonal
        });

        await animateResult(fallbackData.visitedOrder || [], fallbackData.path || []);
        setStats(fallbackData.stats || null);

        if (fallbackData.found) {
          setStatus(`Path found with ${fallbackData.path.length} nodes. (Browser mode)`);
        } else {
          setStatus("No path found. Try reducing walls or enabling diagonals. (Browser mode)");
        }
      } catch (fallbackError) {
        const fallbackHint = lastFetchError ? " If you deployed only frontend, this is expected and browser fallback should handle it." : "";
        setStatus((fallbackError?.message || error?.message || "Unexpected error.") + fallbackHint);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="hero">
        <div className="hero-content">
          <h1>Multi-Algorithm Pathfinding Visualizer</h1>
          <p>
            Build maps, choose an algorithm, and compare how search strategies explore space and discover optimal or approximate routes.
          </p>
        </div>
        <aside className="hero-side">
          <label htmlFor="theme-select" className="theme-side-label">
            Theme
          </label>
          <div className="theme-select-wrap">
            <span className="theme-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 2c-5.5 0-10 4.5-10 10a8 8 0 0 0 8 8h1.2a2.8 2.8 0 0 0 0-5.6h-.6a2.1 2.1 0 0 1-2.1-2.1c0-1.1.9-2.1 2.1-2.1h2.6A4.8 4.8 0 0 0 18 5.4C16.5 3.2 14.4 2 12 2Zm-4 8.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm2.6-3.2a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm4.1 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm2.6 3.1a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
              </svg>
            </span>
            <select
              id="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={isRunning}
            >
              {THEMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <p className="created-by">
            Created by: S Guhan Raj
            <br />
            <span className="created-by-indent">Adithya Vel M</span>
          </p>
        </aside>
      </header>

      <section className="controls">
        <div className="control-group">
          <label>Algorithm</label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} disabled={isRunning}>
            {ALGORITHMS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Rows</label>
          <input
            type="number"
            min="8"
            max="35"
            value={rows}
            disabled={isRunning}
            onChange={(e) => handleResize(e.target.value, cols)}
          />
        </div>

        <div className="control-group">
          <label>Cols</label>
          <input
            type="number"
            min="10"
            max="60"
            value={cols}
            disabled={isRunning}
            onChange={(e) => handleResize(rows, e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>Animation (ms)</label>
          <input
            type="number"
            min="2"
            max="50"
            value={speed}
            disabled={isRunning}
            onChange={(e) => setSpeed(Math.max(2, Number(e.target.value)))}
          />
        </div>

        <div className="control-toggle">
          <label htmlFor="diagonal">Allow Diagonal</label>
          <input
            id="diagonal"
            type="checkbox"
            checked={allowDiagonal}
            disabled={isRunning}
            onChange={(e) => setAllowDiagonal(e.target.checked)}
          />
        </div>

        <button className="primary" onClick={runAlgorithm} disabled={isRunning}>
          {isRunning ? "Running..." : "Visualize"}
        </button>
        <button onClick={randomMaze} disabled={isRunning}>Random Maze</button>
        <button onClick={resetGrid} disabled={isRunning}>Reset</button>
      </section>

      <section className="toolbar">
        <span>Drawing Tool</span>
        <button className={tool === TOOL.WALL ? "active" : ""} onClick={() => setTool(TOOL.WALL)}>
          Wall
        </button>
        <button className={tool === TOOL.ERASE ? "active" : ""} onClick={() => setTool(TOOL.ERASE)}>
          Erase
        </button>
        <button className={tool === TOOL.START ? "active" : ""} onClick={() => setTool(TOOL.START)}>
          Set Start
        </button>
        <button className={tool === TOOL.END ? "active" : ""} onClick={() => setTool(TOOL.END)}>
          Set End
        </button>
        <p className="draw-hint">Hold mouse and drag to paint walls or erase continuously.</p>
      </section>

      <section className="board-wrap">
        <div
          className="board"
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <button
                type="button"
                key={`${r}-${c}`}
                className={`cell ${cell}`}
                onPointerDown={() => handleCellPointerDown(r, c)}
                onPointerEnter={() => handleCellPointerEnter(r, c)}
                onPointerUp={stopDrawing}
                aria-label={`cell-${r}-${c}`}
              />
            ))
          )}
        </div>
      </section>

      <footer className="legend-panel">
        <div className="legend">
          <span className="chip start" /> Start
          <span className="chip end" /> End
          <span className="chip wall" /> Wall
          <span className="chip visited" /> Visited
          <span className="chip path" /> Final Path
        </div>
        <p>{status}</p>
        {stats ? (
          <p>
            Visited nodes: <strong>{stats.visitedNodes}</strong> | Path length: <strong>{stats.pathLength}</strong>
          </p>
        ) : null}
      </footer>
    </div>
  );
}

export default App;
