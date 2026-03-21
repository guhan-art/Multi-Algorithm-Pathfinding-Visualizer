const ORTHOGONAL_DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

const DIAGONAL_DIRECTIONS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
];

function key(row, col) {
  return `${row},${col}`;
}

function parseKey(nodeKey) {
  const [row, col] = nodeKey.split(",").map(Number);
  return { row, col };
}

function inBounds(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

function isWalkable(grid, row, col) {
  return inBounds(grid, row, col) && grid[row][col] !== 1;
}

function getDirections(allowDiagonal) {
  return allowDiagonal
    ? [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]
    : ORTHOGONAL_DIRECTIONS;
}

function getNeighbors(grid, row, col, allowDiagonal) {
  const directions = getDirections(allowDiagonal);
  const neighbors = [];

  for (const [dr, dc] of directions) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (isWalkable(grid, nextRow, nextCol)) {
      neighbors.push({ row: nextRow, col: nextCol });
    }
  }

  return neighbors;
}

function heuristic(a, b, allowDiagonal) {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  if (allowDiagonal) {
    return Math.max(dr, dc);
  }
  return dr + dc;
}

function movementCost(from, to) {
  const isDiagonal = from.row !== to.row && from.col !== to.col;
  return isDiagonal ? Math.SQRT2 : 1;
}

function reconstructPath(cameFrom, startKey, endKey) {
  if (!cameFrom.has(endKey) && startKey !== endKey) {
    return [];
  }

  const path = [];
  let current = endKey;

  while (current) {
    path.push(parseKey(current));
    if (current === startKey) {
      break;
    }
    current = cameFrom.get(current);
  }

  path.reverse();
  return path;
}

function queuePopSmallest(queue) {
  queue.sort((a, b) => a.priority - b.priority);
  return queue.shift();
}

function runBfs({ grid, start, end, allowDiagonal }) {
  const startKey = key(start.row, start.col);
  const endKey = key(end.row, end.col);
  const queue = [start];
  const visited = new Set([startKey]);
  const cameFrom = new Map();
  const visitedOrder = [];

  while (queue.length > 0) {
    const current = queue.shift();
    visitedOrder.push(current);

    if (current.row === end.row && current.col === end.col) {
      break;
    }

    for (const next of getNeighbors(grid, current.row, current.col, allowDiagonal)) {
      const nextKey = key(next.row, next.col);
      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      cameFrom.set(nextKey, key(current.row, current.col));
      queue.push(next);
    }
  }

  const path = reconstructPath(cameFrom, startKey, endKey);
  return { visitedOrder, path, found: path.length > 0 };
}

function runDfs({ grid, start, end, allowDiagonal }) {
  const startKey = key(start.row, start.col);
  const endKey = key(end.row, end.col);
  const stack = [start];
  const visited = new Set([startKey]);
  const cameFrom = new Map();
  const visitedOrder = [];

  while (stack.length > 0) {
    const current = stack.pop();
    visitedOrder.push(current);

    if (current.row === end.row && current.col === end.col) {
      break;
    }

    const neighbors = getNeighbors(grid, current.row, current.col, allowDiagonal);
    for (let i = neighbors.length - 1; i >= 0; i -= 1) {
      const next = neighbors[i];
      const nextKey = key(next.row, next.col);
      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      cameFrom.set(nextKey, key(current.row, current.col));
      stack.push(next);
    }
  }

  const path = reconstructPath(cameFrom, startKey, endKey);
  return { visitedOrder, path, found: path.length > 0 };
}

function runDijkstra({ grid, start, end, allowDiagonal }) {
  const startKey = key(start.row, start.col);
  const endKey = key(end.row, end.col);
  const queue = [{ node: start, priority: 0 }];
  const dist = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const visited = new Set();
  const visitedOrder = [];

  while (queue.length > 0) {
    const currentEntry = queuePopSmallest(queue);
    const current = currentEntry.node;
    const currentKey = key(current.row, current.col);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);
    visitedOrder.push(current);

    if (currentKey === endKey) {
      break;
    }

    for (const next of getNeighbors(grid, current.row, current.col, allowDiagonal)) {
      const nextKey = key(next.row, next.col);
      const tentative = dist.get(currentKey) + movementCost(current, next);

      if (tentative < (dist.get(nextKey) ?? Infinity)) {
        dist.set(nextKey, tentative);
        cameFrom.set(nextKey, currentKey);
        queue.push({ node: next, priority: tentative });
      }
    }
  }

  const path = reconstructPath(cameFrom, startKey, endKey);
  return {
    visitedOrder,
    path,
    found: path.length > 0,
    cost: dist.get(endKey) ?? null
  };
}

function runAStar({ grid, start, end, allowDiagonal }) {
  const startKey = key(start.row, start.col);
  const endKey = key(end.row, end.col);
  const open = [{ node: start, priority: heuristic(start, end, allowDiagonal) }];
  const gScore = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const visited = new Set();
  const visitedOrder = [];

  while (open.length > 0) {
    const currentEntry = queuePopSmallest(open);
    const current = currentEntry.node;
    const currentKey = key(current.row, current.col);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);
    visitedOrder.push(current);

    if (currentKey === endKey) {
      break;
    }

    for (const next of getNeighbors(grid, current.row, current.col, allowDiagonal)) {
      const nextKey = key(next.row, next.col);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + movementCost(current, next);

      if (tentativeG < (gScore.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, currentKey);
        gScore.set(nextKey, tentativeG);
        const fScore = tentativeG + heuristic(next, end, allowDiagonal);
        open.push({ node: next, priority: fScore });
      }
    }
  }

  const path = reconstructPath(cameFrom, startKey, endKey);
  return {
    visitedOrder,
    path,
    found: path.length > 0,
    cost: gScore.get(endKey) ?? null
  };
}

function runGreedyBestFirst({ grid, start, end, allowDiagonal }) {
  const startKey = key(start.row, start.col);
  const endKey = key(end.row, end.col);
  const open = [{ node: start, priority: heuristic(start, end, allowDiagonal) }];
  const cameFrom = new Map();
  const visited = new Set();
  const visitedOrder = [];

  while (open.length > 0) {
    const currentEntry = queuePopSmallest(open);
    const current = currentEntry.node;
    const currentKey = key(current.row, current.col);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);
    visitedOrder.push(current);

    if (currentKey === endKey) {
      break;
    }

    for (const next of getNeighbors(grid, current.row, current.col, allowDiagonal)) {
      const nextKey = key(next.row, next.col);
      if (visited.has(nextKey)) {
        continue;
      }

      if (!cameFrom.has(nextKey)) {
        cameFrom.set(nextKey, currentKey);
      }

      open.push({ node: next, priority: heuristic(next, end, allowDiagonal) });
    }
  }

  const path = reconstructPath(cameFrom, startKey, endKey);
  return { visitedOrder, path, found: path.length > 0 };
}

export function solvePathfinding({ grid, start, end, algorithm = "astar", allowDiagonal = false }) {
  if (!isWalkable(grid, start.row, start.col)) {
    throw new Error("Start node is blocked.");
  }

  if (!isWalkable(grid, end.row, end.col)) {
    throw new Error("End node is blocked.");
  }

  const normalized = String(algorithm).toLowerCase();
  const payload = { grid, start, end, allowDiagonal };

  let result;

  switch (normalized) {
    case "bfs":
      result = runBfs(payload);
      break;
    case "dfs":
      result = runDfs(payload);
      break;
    case "dijkstra":
      result = runDijkstra(payload);
      break;
    case "astar":
      result = runAStar(payload);
      break;
    case "greedy":
    case "gbfs":
      result = runGreedyBestFirst(payload);
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  return {
    algorithm: normalized,
    found: result.found,
    visitedOrder: result.visitedOrder,
    path: result.path,
    cost: result.cost ?? (result.path.length > 1 ? result.path.length - 1 : 0),
    stats: {
      visitedNodes: result.visitedOrder.length,
      pathLength: result.path.length,
      executionNote: "Client handles animation and timing."
    }
  };
}
