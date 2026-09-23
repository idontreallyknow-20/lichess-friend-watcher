export const HUB_URL = 'https://josephleung-site.vercel.app';

/** Site credit linking back to the author's hub site. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer__credit">
        Built by{' '}
        <a href={HUB_URL} rel="author">
          Joseph Leung
        </a>
      </p>
      <p>
        Joseph Wah Sing Leung is a retired national-level chess player from Richmond Hill, Ontario, and the founder
        of Daily Brief HQ.
      </p>
      <p className="site-footer__links">
        <a href="https://github.com/idontreallyknow-20/lichess-friend-watcher" target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
        <span aria-hidden="true">·</span>
        <a href="https://dailybriefhq.com" target="_blank" rel="noopener noreferrer">
          Daily Brief HQ
        </a>
        <span aria-hidden="true">·</span>
        <span>Not affiliated with lichess.org</span>
      </p>
    </footer>
  );
}
