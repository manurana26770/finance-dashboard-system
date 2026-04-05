type EndpointDocConfig = {
  purpose: string;
  behavior: string[];
  access: string[];
  flow: string[];
  notes?: string[];
};

const toMarkdownSection = (title: string, lines: string[]) => {
  if (lines.length === 0) {
    return '';
  }

  const content = lines.map((line) => `- ${line}`).join('\n');
  return `**${title}**\n${content}`;
};

export const buildEndpointDescription = (config: EndpointDocConfig): string => {
  const sections = [
    `**Purpose**\n${config.purpose}`,
    toMarkdownSection('Behavior', config.behavior),
    toMarkdownSection('Access', config.access),
    toMarkdownSection('Flow', config.flow),
    toMarkdownSection('Notes', config.notes ?? []),
  ].filter(Boolean);

  return sections.join('\n\n');
};
