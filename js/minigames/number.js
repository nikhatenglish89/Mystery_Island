import { choiceBoard } from './common.js';
export default {
  id: 'number',
  mount(root, ch, api) { return choiceBoard(root, ch, api, { big: true }); },
};
