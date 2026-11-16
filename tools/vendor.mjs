// npm run vendor : rebuilds vendor/three.min.js with only the Three.js classes render.js uses.
// Run it after render.js starts using a new THREE.* class, or after changing the three version in package.json.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const names = [...new Set((readFileSync('render.js', 'utf8') + readFileSync('models.js', 'utf8')).match(/THREE\.[A-Za-z0-9]+/g))].map(n => n.slice(6)).sort();
writeFileSync('vendor/three-entry.js', `export { ${names.join(', ')} } from 'three';\n`);
await build({ entryPoints: ['vendor/three-entry.js'], bundle: true, minify: true, format: 'esm', legalComments: 'eof', outfile: 'vendor/three.min.js' });
console.log(`vendor/three.min.js: ${names.length} classes, ${(readFileSync('vendor/three.min.js').length / 1024).toFixed(0)}KB`);
