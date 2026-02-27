// src/dashboard/components/links/LinkMeta.jsx
export function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return ''; }
}

export function getFavicon(url, size = 32) {
  const domain = getDomain(url);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

export function resolveFavicon(link, size = 32) {
  return link.favicon || getFavicon(link.original_url, size);
}

export function resolveDomain(link) {
  return link.domain || getDomain(link.original_url);
}

export function formatUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    const display = u.hostname.replace('www.', '') + path;
    return display.length > 60 ? display.slice(0, 57) + '…' : display;
  } catch { return url; }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return 'now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d`;
    if (day < 30) return `${Math.floor(day / 7)}w`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function LinkMeta({ link }) {
  const domain = resolveDomain(link);
  const time = link.relative_time || timeAgo(link.created_at);

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 tabular-nums">
      <span className="truncate max-w-[120px]">{domain}</span>
      {time && (
        <>
          <span className="text-gray-700">·</span>
          <span className="flex-shrink-0">{time}</span>
        </>
      )}
      {link.click_count > 0 && (
        <>
          <span className="text-gray-700">·</span>
          <span className="flex items-center gap-0.5 flex-shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            {link.click_count}
          </span>
        </>
      )}
    </div>
  );
}