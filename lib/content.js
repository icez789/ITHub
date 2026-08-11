import 'server-only';

import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
  'pre', 'code', 'ol', 'ul', 'li', 'a', 'span', 'h1', 'h2', 'h3',
];

export function sanitizeRichText(value) {
  return sanitizeHtml(String(value || ''), {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['class'],
      pre: ['class'],
      code: ['class'],
    },
    allowedClasses: {
      span: [/^ql-/],
      pre: ['ql-syntax'],
      code: [/^language-/],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer' }, true),
    },
  }).trim();
}

export function plainText(value, maxLength = 10_000) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
