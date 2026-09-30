// Single in-memory app state. Persistence goes through storage.js.
export const S = {
  data: null,        // {levels, questions, rewards, achievements, config}
  profiles: [],
  profile: null,
  progress: null,
  rewards: null,
  ach: null,
  sessionStart: 0,
};
