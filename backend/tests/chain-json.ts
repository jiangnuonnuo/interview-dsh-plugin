export const chainBrief = (fields: Record<string, unknown>): string => {
  const relation = fields.relation;
  const matchedMove =
    fields.matchedMove ??
    (relation === 'followup' ? 'deep' : relation === 'next_topic' ? 'switch' : 'deep');
  return JSON.stringify({
    pointName: '索引',
    layer: 'why',
    intent: '说出机制',
    moves: {
      deep: '换一个前提再问',
      partial: '只追没说到的缺口',
      miss: '留在本层换一种问法',
    },
    matchedMove,
    ...fields,
  });
};
