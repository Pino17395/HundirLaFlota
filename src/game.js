export const SIZE = 10;
export const FLEET = [
  { id: 'carrier', name: 'Portaaviones', length: 5, mark: '▰' },
  { id: 'battleship', name: 'Acorazado', length: 4, mark: '▰' },
  { id: 'cruiser', name: 'Crucero', length: 3, mark: '▰' },
  { id: 'submarine', name: 'Submarino', length: 3, mark: '▰' },
  { id: 'destroyer', name: 'Destructor', length: 2, mark: '▰' },
];

export const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

export function canPlace(board, row, col, length, vertical) {
  for (let i = 0; i < length; i++) {
    const r = row + (vertical ? i : 0), c = col + (vertical ? 0 : i);
    if (r >= SIZE || c >= SIZE || board[r][c]) return false;
  }
  return true;
}

export function placeShip(board, ship, row, col, vertical) {
  if (!canPlace(board, row, col, ship.length, vertical)) return null;
  const next = board.map(line => [...line]);
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    const r = row + (vertical ? i : 0), c = col + (vertical ? 0 : i);
    next[r][c] = ship.id; cells.push([r, c]);
  }
  return { board: next, ship: { ...ship, cells, hits: 0 } };
}

export function randomFleet() {
  let board = emptyBoard(); const ships = [];
  for (const ship of FLEET) {
    let placed = false, attempts = 0;
    while (!placed && attempts++ < 2000) {
      const vertical = Math.random() < 0.5;
      const row = Math.floor(Math.random() * SIZE), col = Math.floor(Math.random() * SIZE);
      const result = placeShip(board, ship, row, col, vertical);
      if (result) { board = result.board; ships.push(result.ship); placed = true; }
    }
  }
  return { board, ships };
}

export function fireAt(state, row, col) {
  if (state.shots[row][col] || state.over) return state;
  const shots = state.shots.map(line => [...line]); shots[row][col] = true;
  const shipId = state.board[row][col];
  const ships = state.ships.map(s => s.id === shipId ? { ...s, hits: s.hits + 1 } : s);
  const sunkShip = ships.find(s => s.id === shipId && s.hits === s.length);
  const over = ships.every(s => s.hits === s.length);
  return { ...state, shots, ships, over, last: { row, col, hit: !!shipId, sunk: sunkShip?.name || null } };
}

export const freshFleetState = (fleet = randomFleet()) => ({ ...fleet, shots: Array.from({ length: SIZE }, () => Array(SIZE).fill(false)), over: false, last: null });
