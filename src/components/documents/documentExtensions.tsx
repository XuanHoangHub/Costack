"use client";

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { CheckCircle2, Circle, ArrowUpRight } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { safeDocumentUrl } from '@/lib/documentModel';

export const DocumentCallout = Node.create({
  name: 'docCallout', group: 'block', content: 'block+', defining: true,
  addAttributes: () => ({ tone: { default: 'info', parseHTML: element => element.getAttribute('data-tone') } }),
  parseHTML: () => [{ tag: 'aside[data-doc-callout]' }],
  renderHTML: ({ HTMLAttributes }) => ['aside', mergeAttributes(HTMLAttributes, { 'data-doc-callout': '', 'data-tone': HTMLAttributes.tone }), 0],
});
export const DocumentColumns = Node.create({
  name: 'docColumns', group: 'block', content: 'docColumn{2,3}', defining: true,
  parseHTML: () => [{ tag: 'div[data-doc-columns]' }],
  renderHTML: () => ['div', { 'data-doc-columns': '' }, 0],
});
export const DocumentColumn = Node.create({
  name: 'docColumn', content: 'block+', isolating: true,
  parseHTML: () => [{ tag: 'section[data-doc-column]' }],
  renderHTML: () => ['section', { 'data-doc-column': '' }, 0],
});
export const DocumentImage = Node.create({
  name: 'docImage', group: 'block', atom: true, draggable: true,
  addAttributes: () => ({ src: { default: '' }, alt: { default: '' }, title: { default: '' } }),
  parseHTML: () => [{ tag: 'img[src]', getAttrs: element => safeDocumentUrl((element as HTMLElement).getAttribute('src') || '') ? {} : false }],
  renderHTML: ({ HTMLAttributes }) => ['img', mergeAttributes(HTMLAttributes, { src: safeDocumentUrl(HTMLAttributes.src) || '', loading: 'lazy', class: 'doc-content-image' })],
});

function TaskReference({ node }: NodeViewProps) {
  const task = useTaskStore(state => state.tasks.find(item => item.id === node.attrs.taskId));
  return <NodeViewWrapper className="doc-task-reference" contentEditable={false}>
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('apexa-open-task', { detail: { taskId: node.attrs.taskId } }))}>
      {task?.status === 'completed' ? <CheckCircle2 size={19} /> : <Circle size={19} />}
      <span><strong>{task?.title || node.attrs.title}</strong><small>Công việc liên kết{task?.dueDate ? ` · ${task.dueDate.slice(0, 10)}` : ''}</small></span><ArrowUpRight size={17} />
    </button>
  </NodeViewWrapper>;
}
export const DocumentTask = Node.create({
  name: 'docTask', group: 'block', atom: true, draggable: true,
  addAttributes: () => ({ taskId: { default: '', parseHTML: element => element.getAttribute('data-task-id') }, title: { default: 'Công việc', parseHTML: element => element.textContent } }),
  parseHTML: () => [{ tag: 'div[data-task-id]' }],
  renderHTML: ({ node }) => ['div', { 'data-task-id': node.attrs.taskId }, node.attrs.title],
  addNodeView: () => ReactNodeViewRenderer(TaskReference),
});

export const documentExtensions = [DocumentCallout, DocumentColumns, DocumentColumn, DocumentImage, DocumentTask];
