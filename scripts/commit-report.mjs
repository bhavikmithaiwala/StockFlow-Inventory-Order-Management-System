import { execFileSync } from 'node:child_process';
const log = execFileSync('git', ['log', '--reverse', '--format=%h|%aI|%cI|%s', '09b8d2c..HEAD'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);
console.log(
  `# StockFlow incremental commit inventory\n\n${log.length} actual new commits after preserved initial commit 09b8d2c. Author and committer timestamps come directly from Git.\n\n| # | Hash | Author date | Committer date | Change |\n| --- | --- | --- | --- | --- |`,
);
log.forEach((line, index) => console.log(`| ${index + 1} | ${line.split('|').join(' | ')} |`));
console.log(
  '\nThis is a generated snapshot. Run `node scripts/commit-report.mjs` for the complete current inventory, including the release commit containing this file. Full published history: https://github.com/bhavikmithaiwala/StockFlow-Inventory-Order-Management-System/commits/main',
);
