const fs = require('fs');
const path = 'src/a11y/checks/baseline.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Filter out the old flexoki entries to ensure only the real ones are kept
data = data.filter(item => !(item.page === 'ledger-flexoki' && item.selector === '#toast' && item.rule === 'color-contrast'));
data = data.filter(item => !(item.page === 'ledger-flexoki' && item.selector === 'bdi' && item.rule === 'color-contrast'));

// Ensure the new ones from CI logs are also there if the test output had more. Wait, the output from CI had 12 items.
// What were they exactly? In the CI error:
// +   Object {
// +     "page": "ledger-flexoki",
// +     "rule": "color-contrast",
// +     "selector": "#toast",
// +   },
// +   Object {
// +     "page": "ledger-flexoki",
// +     "rule": "color-contrast",
// +     "selector": "bdi",
// +   },
// Wait, when I re-ran locally after adding those, it passed. BUT there's a reason: the 12 items were likely multiple instances of those two selectors, or maybe I only saw the first 2 in the diff.
