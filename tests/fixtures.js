import { readFileSync } from 'node:fs';
export const data = Object.fromEntries([['map','maps/original-board'],['buildings','cards/base-buildings-and-provisions'],['parchments','cards/base-parchments']].map(([key,path])=>[key,JSON.parse(readFileSync(new URL(`../data/${path}.json`,import.meta.url)))]));
