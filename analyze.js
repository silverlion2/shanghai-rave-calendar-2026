const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const events = data.events;

console.log('=== 数据概览 ===');
console.log('总活动数:', events.length);

// 按来源统计
const sources = {};
events.forEach(e => {
  const s = e.sourceLabel || 'unknown';
  sources[s] = (sources[s] || 0) + 1;
});
console.log('\n按来源分布:');
Object.entries(sources).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});

// 按场馆统计
const venues = {};
events.forEach(e => {
  const v = e.venue || 'unknown';
  venues[v] = (venues[v] || 0) + 1;
});
console.log('\nTop 场馆:');
Object.entries(venues).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});

// 检查有海报覆盖
const withPoster = events.filter(e => e.posterUrl || e.imageTheme !== 'missing');
console.log('\n海报覆盖率:', withPoster.length, '/', events.length, '=', (withPoster.length / events.length * 100).toFixed(1), '%');

// 检查状态
const byStatus = {};
events.forEach(e => {
  const s = e.status || 'unknown';
  byStatus[s] = (byStatus[s] || 0) + 1;
});
console.log('\n按状态:');
Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});
