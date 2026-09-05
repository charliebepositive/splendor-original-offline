const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(base, 'docs/source-cards.json'), 'utf8').replace(/^\uFEFF/, ''));
const cards = source.cards.map(c => ({id:c.id, level:c.level, bonus:c.bonus, points:c.prestige_points, cost:c.cost, image:`assets/cards/${c.id}.png`}));
// Classic 2014 base box: five pairs at 4 and five triples at 3.
const requirements = [{green:4,red:4},{white:3,red:3,black:3},{white:4,blue:4},{white:4,black:4},{blue:4,green:4},{blue:3,green:3,red:3},{white:3,blue:3,green:3},{red:4,black:4},{white:3,blue:3,black:3},{green:3,red:3,black:3}];
const nobles = requirements.map((cost,i)=>({id:`noble-${i+1}`,points:3,cost}));
fs.writeFileSync(path.join(base,'js/data.js'), `/* Card facts transcribed from physical classic cards. See docs/SOURCES.md. */\n(function(){const data=${JSON.stringify({cards,nobles})};if(typeof module!=='undefined')module.exports=data;else window.SplendorData=data;})();\n`);
const files = ['index.html','css/style.css','css/android.css','js/platform.js','js/data.js','js/engine.js','js/ai.js','js/ui.js','manifest.json','assets/icon.svg','docs/rules.html','docs/Splendor-EN.pdf',...cards.map(c=>c.image)];
fs.writeFileSync(path.join(base,'js/offline-files.js'),`self.OFFLINE_FILES=${JSON.stringify(files)};\n`);
console.log(`Built ${cards.length} cards and ${nobles.length} nobles.`);
