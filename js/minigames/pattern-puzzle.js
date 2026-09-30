import { choiceBoard } from './common.js';
export default {
  id: 'pattern-puzzle',
  mount(root, ch, api) { return choiceBoard(root, ch, api, { big: true }); },
};
