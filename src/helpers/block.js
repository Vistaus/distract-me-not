import { translate } from './i18n';
import { sendMessage, storage, getActiveTabHostname, getActiveTab, createWindow, indexUrl } from 'helpers/webext';

export const Mode = {
  blacklist: 'blacklist',
  whitelist: 'whitelist',
  combined: 'combined',
};

export const Action = {
  blockTab: 'blockTab',
  redirectToUrl: 'redirectToUrl',
  closeTab: 'closeTab',
};

export const UnblockOptions = {
  unblockOnce: 'unblock-once',
  unblockForWhile: 'unblock-for-while',
};

export const modes = [
  { label: translate('blacklist'), value: Mode.blacklist },
  { label: translate('whitelist'), value: Mode.whitelist },
  { label: translate('combined'), value: Mode.combined, tooltip: translate('combinedDescription') },
];

export const actions = [
  { label: translate('blockTab'), value: Action.blockTab },
  { label: translate('redirectToUrl'), value: Action.redirectToUrl },
  { label: translate('closeTab'), value: Action.closeTab },
];

export const defaultAction = Action.blockTab;

export const defaultMode = Mode.blacklist;

export const defaultBlacklist = [
  '*.facebook.com',
  '*.twitter.com',
  '*.youtube.com',
];

export const defaultWhitelist = [
  '*.wikipedia.org',
];

export const defaultUnblock = {
  isEnabled: false,
  requirePassword: false,
  unblockOnceTimeout: 10, // seconds
  displayNotificationOnTimeout: true,
  autoReblockOnTimeout: false,
};

export function isAccessible(url) {
  return url && !url.startsWith('about:') && !/^(?:file|chrome|moz-extension|chrome-extension):\/\//i.test(url);
}

export function isPageReloaded() {
  try {
    return (window.performance.navigation && window.performance.navigation.type === 1) ||
            window.performance
              .getEntriesByType('navigation')
              .map((nav) => nav.type)
              .includes('reload');
  } catch (error) {
    return false;
  }
}

export function blockUrl(url, mode = Mode.blacklist) {
  return new Promise((resolve, reject) => {
    switch (mode) {
      case Mode.blacklist:
      case Mode.combined:
        storage.get({
          blacklist: defaultBlacklist
        }).then(({ blacklist }) => {
          for (const item of blacklist) {
            if (item === url) {
              return;
            }
          }
          blacklist.splice(0, 0, url);
          sendMessage('setBlacklist', blacklist);
          storage.set({ blacklist: blacklist });
          resolve();
        }).catch((error) => {
          reject(error)
        });
        break;
      case Mode.whitelist:
        // ToDo: merge common code (@see above)
        storage.get({
          whitelist: defaultWhitelist
        }).then(({ whitelist }) => {
          for (const item of whitelist) {
            if (item === url) {
              return;
            }
          }
          whitelist.splice(0, 0, url);
          sendMessage('setWhitelist', whitelist);
          storage.set({ whitelist: whitelist });
          resolve();
        }).catch((error) => {
          reject(error)
        });
        break;
      default:
        break;
    }
  });
}

export async function addCurrentWebsite(mode, isPrompt = false) {
  const hostname = await getActiveTabHostname();
  if (hostname) {
    const url = `*.${hostname}`;
    if (isPrompt) {
      createWindow(`${indexUrl}#addWebsitePrompt?url=${url}&mode=${mode}`, 600, 140);
    } else {
      blockUrl(url, mode);
      return true;
    }
  }
  return false;
}

export async function isActiveTabBlockable(mode) {
  const tab = await getActiveTab();
  if (!tab) {
    return false;
  }
  if (!isAccessible(tab.url)) {
    return false;
  } else {
    switch (mode) {
      case Mode.blacklist:
      case Mode.combined:
        const isBlacklisted = await sendMessage('isBlacklisted', tab.url);
        if (isBlacklisted) {
          return false;
        }
        break;
      case Mode.whitelist:
        const isWhitelisted = await sendMessage('isWhitelisted', tab.url);
        if (isWhitelisted) {
          return false;
        }
        break;
      default:
        break;
    }
  }
  return true;
}
