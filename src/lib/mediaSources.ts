import type { BrowserCookies } from '~types/downloader';

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function detectMediaSource(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();

    if (hostMatches(host, 'youtube.com') || hostMatches(host, 'youtu.be')) {
      return 'YouTube';
    }
    if (hostMatches(host, 'tiktok.com')) {
      return 'TikTok';
    }
    if (
      hostMatches(host, 'facebook.com') ||
      hostMatches(host, 'fb.watch') ||
      hostMatches(host, 'fb.gg') ||
      hostMatches(host, 'fb.com')
    ) {
      return 'Facebook';
    }
    if (
      hostMatches(host, 'x.com') ||
      hostMatches(host, 'twitter.com') ||
      hostMatches(host, 't.co') ||
      hostMatches(host, 'vxtwitter.com') ||
      hostMatches(host, 'fxtwitter.com')
    ) {
      return 'X';
    }
    if (hostMatches(host, 'instagram.com') || hostMatches(host, 'instagr.am')) {
      return 'Instagram';
    }
    if (hostMatches(host, 'soundcloud.com')) {
      return 'SoundCloud';
    }
    if (hostMatches(host, 'vimeo.com')) {
      return 'Vimeo';
    }
    if (hostMatches(host, 'twitch.tv')) {
      return 'Twitch';
    }
    if (hostMatches(host, 'reddit.com') || hostMatches(host, 'redd.it')) {
      return 'Reddit';
    }
    if (hostMatches(host, 'bilibili.com') || hostMatches(host, 'b23.tv')) {
      return 'Bilibili';
    }
    if (hostMatches(host, 'dailymotion.com') || hostMatches(host, 'dai.ly')) {
      return 'Dailymotion';
    }
    if (hostMatches(host, 'bandcamp.com')) {
      return 'Bandcamp';
    }

    return host.replace(/^(www|m)\./, '') || 'Web';
  } catch {
    return 'Web';
  }
}

export interface BrowserCookieOption {
  value: BrowserCookies;
  label: string;
  badge: string;
  hint: string;
}

export const BROWSER_COOKIE_OPTIONS: BrowserCookieOption[] = [
  {
    value: 'none',
    label: 'None (Public links)',
    badge: 'OFF',
    hint: 'Anonymous requests',
  },
  {
    value: 'firefox',
    label: 'Firefox',
    badge: 'FF',
    hint: 'Read session cookies',
  },
  {
    value: 'chrome',
    label: 'Google Chrome',
    badge: 'CHR',
    hint: 'Read session cookies',
  },
  {
    value: 'brave',
    label: 'Brave',
    badge: 'BRV',
    hint: 'Read session cookies',
  },
  {
    value: 'chromium',
    label: 'Chromium',
    badge: 'CRM',
    hint: 'Read session cookies',
  },
  {
    value: 'edge',
    label: 'Microsoft Edge',
    badge: 'EDG',
    hint: 'Read session cookies',
  },
  {
    value: 'vivaldi',
    label: 'Vivaldi',
    badge: 'VIV',
    hint: 'Read session cookies',
  },
  {
    value: 'opera',
    label: 'Opera',
    badge: 'OPR',
    hint: 'Read session cookies',
  },
  {
    value: 'safari',
    label: 'Safari',
    badge: 'SAF',
    hint: 'macOS session cookies',
  },
];
