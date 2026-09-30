import number from './number.js';
import wordBuilder from './word-builder.js';
import memory from './memory-sequence.js';
import pattern from './pattern-puzzle.js';
import hunt from './object-hunt.js';
import maze from './maze-path.js';
import science from './science-choice.js';
import spot from './spot-difference.js';

export const ENGINES = {
  [number.id]: number, [wordBuilder.id]: wordBuilder, [memory.id]: memory, [pattern.id]: pattern,
  [hunt.id]: hunt, [maze.id]: maze, [science.id]: science, [spot.id]: spot,
};
