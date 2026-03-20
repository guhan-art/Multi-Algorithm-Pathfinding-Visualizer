# Multi-Algorithm Pathfinding Visualizer

A professional, web-based AI course project that lets users design a grid world, run multiple pathfinding algorithms, and compare how each strategy explores the map.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Visualization: Interactive animated grid with custom UI theme
- Runtime: `concurrently` from root for one-command full-stack launch

## Implemented Algorithms

- A*
- Dijkstra
- Breadth-First Search (BFS)
- Depth-First Search (DFS)
- Greedy Best-First Search

## Features

- Interactive grid with click-based editing
- Tool modes: Wall, Erase, Set Start, Set End
- Input controls for rows, columns, algorithm, diagonal movement, animation speed
- Random maze generator
- Animated visited nodes and final path output
- Stats panel showing visited node count and path length
- Responsive layout for desktop and mobile

## Project Structure

```text
.
|- backend/
|  |- src/
|  |  |- server.js
|  |  \- solver.js
|  \- package.json
|- frontend/
|  |- src/
|  |  |- App.jsx
|  |  |- main.jsx
|  |  \- styles.css
|  |- index.html
|  |- vite.config.js
|  \- package.json
|- roadmap.md
|- package.json
\- readme.md
```

## One-Command Full Run

From the project root:

```bash
npm run up
```

What `npm run up` does:

1. Installs backend dependencies.
2. Installs frontend dependencies.
3. Starts both backend and frontend together.

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Contract

### POST `/api/pathfind`

Request body:

```json
{
	"grid": [[0, 1, 0], [0, 0, 0], [1, 0, 0]],
	"start": { "row": 0, "col": 0 },
	"end": { "row": 2, "col": 2 },
	"algorithm": "astar",
	"allowDiagonal": false
}
```

Response body (example):

```json
{
	"algorithm": "astar",
	"found": true,
	"visitedOrder": [{ "row": 0, "col": 0 }],
	"path": [{ "row": 0, "col": 0 }, { "row": 1, "col": 1 }],
	"cost": 2,
	"stats": {
		"visitedNodes": 31,
		"pathLength": 12,
		"executionNote": "Client handles animation and timing."
	}
}
```

## Course Submission Notes

- Use `roadmap.md` to track completed and pending milestones.
- You can demonstrate algorithm differences by changing wall density, diagonal movement, and algorithm selection.
- For best demo clarity, keep grid size around 18x32 with animation speed between 8 and 15 ms.