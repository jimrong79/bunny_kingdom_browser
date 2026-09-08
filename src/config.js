export const hasExpansion = state => state.expansion === 'in_the_sky';
export function dealSize(state) {
  return hasExpansion(state) ? ({2:12,3:15,4:12,5:10})[state.players.length] : state.players.length === 3 ? 12 : 10;
}
export const cardsPerPick = state => state.players.length === 2 ? 1 : hasExpansion(state) && state.players.length === 3 ? 3 : 2;
export const selectionsPerPick = state => state.players.length === 2 ? 2 : cardsPerPick(state);
export const picksPerRound = state => state.players.length === 2 ? dealSize(state) : dealSize(state) / cardsPerPick(state);
