import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AxeBuilder from '@axe-core/playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baselinePath = path.join(__dirname, 'baseline.json');

export async function checkAxeBaseline(page, pageName) {
  let baseline = [];
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const currentFindings = [];
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      for (const target of node.target) {
        currentFindings.push({
          rule: violation.id,
          page: pageName,
          selector: target,
        });
      }
    }
  }

  const baselineForPage = baseline.filter((b) => b.page === pageName);

  const newFindings = currentFindings.filter((finding) => {
    return !baselineForPage.some(
      (b) => b.rule === finding.rule && b.selector === finding.selector
    );
  });

  const staleBaselineEntries = baselineForPage.filter((b) => {
    return !currentFindings.some(
      (finding) => finding.rule === b.rule && finding.selector === b.selector
    );
  });

  return { newFindings, staleBaselineEntries, currentFindings };
}
