// src/dashboard/components/links/linkHelpers.js
import toast from 'react-hot-toast';

export async function copyToClipboard(text, msg = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
    return true;
  } catch {
    toast.error('Copy failed');
    return false;
  }
}

export const copyLinkUrl = (link) => copyToClipboard(link.original_url);
export const copyShortUrl = (link) => copyToClipboard(link.short_url, 'Short URL copied');
export const copyBestUrl = (link) => copyToClipboard(link.short_url || link.original_url);

export function copyMarkdown(link) {
  return copyToClipboard(
    `[${link.title || link.original_url}](${link.original_url})`,
    'Markdown copied',
  );
}

export function openInNewTab(link) {
  window.open(link.original_url, '_blank', 'noopener,noreferrer');
}

export const starLabel = (link) => (link.starred ? 'Unstar' : 'Star');
export const pinLabel = (link) => (link.pinned ? 'Unpin' : 'Pin');
export const archiveLabel = (link) => (link.archived ? 'Restore' : 'Archive');

export function confirmDelete(link) {
  return window.confirm(`Delete "${link.title || 'this link'}"?`);
}