export const PLAYER_NAME_LIMIT = 24;
const royalNames = ['Sir Rabbiton', 'Lady Cottontail', 'Duke Hopsworth'];

export function playerNames(name = '') {
  const human = typeof name === 'string' ? name.replace(/\s+/gu,' ').trim().slice(0,PLAYER_NAME_LIMIT).trim() : '';
  return [human || 'You', ...royalNames.map(bot => bot.toLowerCase() === human.toLowerCase() ? `${bot} II` : bot)];
}

export function validPlayerName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= PLAYER_NAME_LIMIT;
}
