export const boardOf = cell => cell.boardId || 'new_world';
export function neighborsOf(state, cell) {
  const candidates = cell.neighbors || [cell.row+(cell.column-1),cell.row+(cell.column+1),String.fromCharCode(cell.row.charCodeAt(0)-1)+cell.column,String.fromCharCode(cell.row.charCodeAt(0)+1)+cell.column];
  return candidates.filter(id => state.cells[id] && boardOf(state.cells[id]) === boardOf(cell) && !state.blockedConnections.some(e => e.from === cell.coordinate && e.to === id || e.to === cell.coordinate && e.from === id));
}
