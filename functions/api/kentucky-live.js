
function parse(html, sourceDate) {
  const text = plain(html);
  const found = {};

  const digitPattern =
    '([0-9]{4}|[0-9](?:\\s*[-– ]\\s*[0-9]){3})';

  const headings = [...text.matchAll(/\bPick\s*4\b/gi)];

  for (const heading of headings) {
    const section = text.slice(
      heading.index,
      heading.index + 1200
    );

    for (const [market, label] of [
      ['KENTUCKYMID', 'Midday'],
      ['KENTUCKYEVE', 'Evening']
    ]) {
      const pattern = new RegExp(
        '\\b' + label + '\\s*[:–-]?\\s*' + digitPattern,
        'i'
      );

      const match = section.match(pattern);
      if (!match) continue;

      const number = match[1].replace(/\D/g, '');

      if (!/^\d{4}$/.test(number)) continue;

      found[market] = {
        number,
        sourceDate,
        sourceTime: label,
        drawId: 'archive-' + sourceDate + '-' +
          label.toLowerCase()
      };
    }

    if (Object.keys(found).length === 2) break;
  }

  if (!Object.keys(found).length) {
    throw Object.assign(
      Error('Kentucky Pick 4 results not found in page'),
      {
        details: {
          sourceDate,
          preview: text.slice(0, 1000)
        }
      }
    );
  }

  return found;
}
