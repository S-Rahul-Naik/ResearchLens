const state = {
  papers: [],
  runs: []
};

function setPapers(papers) {
  state.papers = papers;
}

function getPapers() {
  return state.papers;
}

function addRun(run) {
  state.runs.unshift(run);
}

function getRuns() {
  return state.runs;
}

module.exports = {
  setPapers,
  getPapers,
  addRun,
  getRuns
};
