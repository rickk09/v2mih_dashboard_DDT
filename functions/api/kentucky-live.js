
function parse(html, sourceDate) {
  const text = plain(html);

  const digitPattern = '([0-9](?:\\s*[-–]\\s*[0-9]){3})';
  const found = {};

  // Cari blok Pick 4 yang benar-benar berisi
  // hasil Midday dan Evening, bukan teks navigasi.
  const headings = [...text.matchAll(/\bPick\s*4\b/gi)];

  for (const heading of headings) {
    const section = text.slice(
      heading.index,
      heading.index + 1200
    );

    const mid = section.match(
      new RegExp('\\bMidday\\s*[:–-]?\\s*' + digitPattern, 'i')
    );

    const eve = section.match(
      new RegExp('\\bEvening\\s*[:–-]?\\s*' + digitPattern, 'i')
    );

    if (!mid || !eve) continue;

    const midday = mid[1].replace(/\D/g, '');
    const evening = eve[1].replace(/\D/g, '');

    if (!/^\d{4}$/.test(midday) ||
        !/^\d{4}$/.test(evening)) {
      continue;
    }

    found.KENTUCKYMID = {
      number: midday,
      sourceDate,
      sourceTime: 'Midday',
      drawId: 'archive-' + sourceDate + '-midday'
    };

    found.KENTUCKYEVE = {
      number: evening,
      sourceDate,
      sourceTime: 'Evening',
      drawId: 'archive-' + sourceDate + '-evening'
    };

    break;
  }

  if (!found.KENTUCKYMID || !found.KENTUCKYEVE) {
    throw Object.assign(
      Error('Kentucky Pick 4 results not found in page'),
      {
        details: {
          sourceDate,
          preview: text.slice(0, 600)
        }
      }
    );
  }

  return found;
}
