// esbuild.extension.js
const esbuild = require('esbuild');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    target: 'node18',
    bundle: true,
    external: ['vscode'],
    sourcemap: true,
    format: 'cjs',
    logLevel: 'info',
  });
  if (watch) {
    await ctx.rebuild();
    await ctx.watch();
    console.log('Extension watch started');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(() => process.exit(1));