'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const codeLanguages = [
  { key: 'plain', label: 'Plain text' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'python', label: 'Python' },
  { key: 'java', label: 'Java' },
  { key: 'cpp', label: 'C++' },
  { key: 'cs', label: 'C#' },
  { key: 'xml', label: 'HTML/XML' },
  { key: 'css', label: 'CSS' },
  { key: 'sql', label: 'SQL' },
  { key: 'bash', label: 'Shell/Bash' },
  { key: 'php', label: 'PHP' },
  { key: 'ruby', label: 'Ruby' },
  { key: 'markdown', label: 'Markdown' },
];

const modules = {
  syntax: {
    hljs,
    languages: codeLanguages,
  },
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    ['code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

export default function Editor({ defaultValue = '', className = 'h-64 mb-12' }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="ithub-editor w-full relative">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={setValue}
        modules={modules}
        className={className}
        placeholder="เขียนรายละเอียดของคุณที่นี่..."
      />
      <input type="hidden" name="content" value={value} />
    </div>
  );
}
