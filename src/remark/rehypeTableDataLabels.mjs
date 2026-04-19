/**
 * Rehype plugin that copies each table column's <th> text onto the
 * corresponding <td>'s `data-label` attribute. That lets mobile CSS
 * transform plain markdown tables into labelled cards without every
 * MDX author having to add attributes by hand.
 *
 * Runs on every MDX file via siteConfig.markdown.rehypePlugins.
 */
import {visit} from 'unist-util-visit';

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(textOf).join('');
  return '';
}

export default function rehypeTableDataLabels() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'table') return;
      const children = node.children || [];
      const thead = children.find((c) => c.tagName === 'thead');
      const tbody = children.find((c) => c.tagName === 'tbody');
      if (!thead || !tbody) return;

      const headerRow = (thead.children || []).find((c) => c.tagName === 'tr');
      if (!headerRow) return;

      const headers = (headerRow.children || [])
        .filter((c) => c.tagName === 'th')
        .map((th) => textOf(th).trim());

      (tbody.children || []).forEach((row) => {
        if (row.tagName !== 'tr') return;
        let i = 0;
        (row.children || []).forEach((cell) => {
          if (cell.tagName !== 'td') return;
          const label = headers[i];
          if (label) {
            cell.properties = cell.properties || {};
            cell.properties['data-label'] = label;
          }
          i += 1;
        });
      });
    });
  };
}
