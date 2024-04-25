import { defineConfig } from 'dumi';

export default defineConfig({
  base: '/x-star-query/',
  publicPath: '/x-star-query/',
  outputPath: 'docs-dist',
  themeConfig: {
    name: 'x-star-query',
    footer:
      '<div class="dumi-default-footer">版权所有©杭州信友队教育科技有限公司 | Powered by <a href="https://d.umijs.org" target="_blank" rel="noreferrer">dumi</a></div>',
    socialLinks: {
      github: 'https://github.com/turingstar-tech/x-star-editor',
    },
  },
});
