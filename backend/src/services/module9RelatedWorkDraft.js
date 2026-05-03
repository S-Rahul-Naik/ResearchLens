const { runModule1Summarization } = require('./module1Summarization');

function cite(paperId) {
  return `[${paperId}]`;
}

function runModule9RelatedWorkDraft(papers, topics) {
  const summaries = runModule1Summarization(papers).summaries;

  const sections = topics.map((topic) => {
    const memberSummaries = summaries.filter((summary) => topic.paperIds.includes(summary.paperId));
    const supportCitations = memberSummaries.map((summary) => cite(summary.paperId)).join(', ');

    const paragraph = [
      `Topic: ${topic.name}.`,
      `Recent work in this theme emphasizes ${topic.keywords.slice(0, 4).join(', ')}.`,
      memberSummaries
        .slice(0, 2)
        .map((summary) => `${summary.summary} ${cite(summary.paperId)}`)
        .join(' '),
      `Collectively, these studies establish a coherent direction but leave open opportunities for bridging studies across neighboring topics (${supportCitations}).`
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      topicId: topic.topicId,
      heading: topic.name,
      paragraph
    };
  });

  const draft = sections
    .map((section) => `### ${section.heading}\n\n${section.paragraph}`)
    .join('\n\n');

  return {
    module: 'M9 Related Work Auto-Draft',
    sections,
    draftMarkdown: draft
  };
}

module.exports = {
  runModule9RelatedWorkDraft
};
