import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLUGIN_ID = 'interview-dsh';

const MODULE_TABLE = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
];

const assetText = (source: string | Uint8Array): string =>
  typeof source === 'string' ? source : new TextDecoder().decode(source);

const cssInjectSnippet = (pluginId: string, cssText: string): string => {
  const tagId = `${pluginId}/client.css`;
  return `var css=${JSON.stringify(cssText)};var tagId=${JSON.stringify(tagId)};if(typeof document!=="undefined"&&document.querySelector("style[data-plugin-css="+JSON.stringify(tagId)+"]")===null){var tag=document.createElement("style");tag.dataset.plugin=${JSON.stringify(pluginId)};tag.dataset.pluginCss=tagId;tag.textContent=css;document.head.appendChild(tag);}`;
};

const insertCssIntoFactory = (code: string, inject: string): string => {
  if (code.includes('data-plugin-css')) {
    return code;
  }
  const factoryAt = code.indexOf('factory:');
  const brace = factoryAt === -1 ? -1 : code.indexOf('{', factoryAt);
  if (brace === -1) {
    return inject + code;
  }
  return `${code.slice(0, brace + 1)}${inject}${code.slice(brace + 1)}`;
};

function inlineCss(pluginId: string): Plugin {
  return {
    name: 'dsh-inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const css: string[] = [];
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && name.endsWith('.css')) {
          css.push(assetText(item.source));
          delete bundle[name];
        }
      }
      if (css.length === 0) {
        return;
      }
      const inject = cssInjectSnippet(pluginId, css.join('\n'));
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && item.isEntry) {
          item.code = insertCssIntoFactory(item.code, inject);
        }
      }
    },
    writeBundle(outputOptions) {
      const dir = outputOptions.dir ?? resolve(__dirname, 'dist');
      const cssPath = resolve(dir, 'style.css');
      const jsPath = resolve(dir, 'client.js');
      if (!existsSync(jsPath)) {
        return;
      }
      if (!existsSync(cssPath)) {
        return;
      }
      const js = readFileSync(jsPath, 'utf8');
      if (!js.includes('data-plugin-css')) {
        writeFileSync(jsPath, insertCssIntoFactory(js, cssInjectSnippet(pluginId, readFileSync(cssPath, 'utf8'))));
      }
      unlinkSync(cssPath);
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCss(PLUGIN_ID)],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/infra/dsh/index.ts'),
      formats: ['cjs'],
      fileName: () => 'client.js',
    },
    rollupOptions: {
      external: MODULE_TABLE,
      output: {
        inlineDynamicImports: true,
        exports: 'named',
        banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
        footer: 'return module.exports; } });',
        intro: 'var module = { exports: {} }; var exports = module.exports;',
      },
    },
    cssCodeSplit: false,
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
});
