// Only records tweets you actually click into (detail page)
// Triggers when URL contains /status/ — meaning you opened a specific tweet
(function () {
  const MAX_TWEETS = 10000;
  const seen = new Set();
  let dead = false;
  let lastUrl = '';

  function isAlive() {
    try { return !!chrome.runtime?.id; } catch (e) { return false; }
  }

  function isStatusPage() {
    return /\/status\/\d+/.test(location.pathname);
  }

  function extractMainTweet() {
    // On a tweet detail page, the main tweet is the first article
    const articles = document.querySelectorAll('article[data-testid="tweet"]');

    for (const article of articles) {
      try {
        const timeLink = article.querySelector('a[href*="/status/"] time');
        if (!timeLink) continue;

        const linkEl = timeLink.closest('a');
        const href = linkEl?.getAttribute('href');
        if (!href) continue;

        const match = href.match(/^\/([^/]+)\/status\/(\d+)/);
        if (!match) continue;

        const authorHandle = match[1];
        const tweetId = match[2];

        // Check if this tweet matches the current URL (it's the main tweet, not a reply)
        if (!location.pathname.includes('/status/' + tweetId)) continue;

        if (seen.has(tweetId)) return null;
        seen.add(tweetId);

        // Author avatar — try multiple selectors, pick the profile image
        let avatarUrl = '';
        const avatarImgs = article.querySelectorAll('img[src*="profile_images"]');
        if (avatarImgs.length > 0) {
          avatarUrl = avatarImgs[0].getAttribute('src') || '';
        } else {
          const fallbackImg = article.querySelector('[data-testid="Tweet-User-Avatar"] img');
          if (fallbackImg) avatarUrl = fallbackImg.getAttribute('src') || '';
        }

        // Author display name
        const userNameEl = article.querySelector('[data-testid="User-Name"]');
        let authorName = '';
        if (userNameEl) {
          const nameLink = userNameEl.querySelector('a[role="link"] span');
          if (nameLink) authorName = nameLink.textContent.trim();
        }

        // Tweet text
        const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
        const content = tweetTextEl ? tweetTextEl.textContent.trim() : '';

        // Timestamp
        const datetime = timeLink.getAttribute('datetime');
        const timestamp = datetime ? new Date(datetime).getTime() : Date.now();

        // Images
        const images = [];
        const imgElements = article.querySelectorAll('[data-testid="tweetPhoto"] img');
        for (const img of imgElements) {
          const src = img.getAttribute('src');
          if (src && !src.includes('emoji') && !src.includes('profile_images')) {
            images.push(src);
          }
        }

        return {
          tweetId,
          authorName: authorName || authorHandle,
          authorHandle,
          avatarUrl,
          content,
          timestamp,
          tweetUrl: 'https://x.com' + href,
          images,
          savedAt: Date.now(),
        };
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  function findAvatarForTweet(tweetId) {
    // Find the specific article that contains this tweet, then get its avatar
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    for (const article of articles) {
      const link = article.querySelector('a[href*="/status/' + tweetId + '"]');
      if (!link) continue;
      // Found the right article — look for avatar within it
      const avatarImg = article.querySelector('img[src*="profile_images"]');
      if (avatarImg) return avatarImg.getAttribute('src') || '';
    }
    return '';
  }

  let writing = false;
  function saveTweet(tweet) {
    if (!isAlive()) { dead = true; return; }
    if (writing) { setTimeout(() => saveTweet(tweet), 200); return; }
    writing = true;

    chrome.storage.local.get({ tweets: [] }, (result) => {
      const existing = result.tweets;
      if (existing.some(t => t.tweetId === tweet.tweetId)) { writing = false; return; }

      existing.unshift(tweet);
      const trimmed = existing.slice(0, MAX_TWEETS);

      chrome.storage.local.set({ tweets: trimmed }, () => {
        writing = false;
        console.log('[X Timeline History] recorded: @' + tweet.authorHandle + (tweet.avatarUrl ? ' (with avatar)' : ' (no avatar)'));
      });
    });
  }

  function updateAvatar(tweetId, avatarUrl) {
    if (!isAlive() || !avatarUrl) return;

    chrome.storage.local.get({ tweets: [] }, (result) => {
      const tweets = result.tweets;
      const tweet = tweets.find(t => t.tweetId === tweetId);
      if (tweet && !tweet.avatarUrl) {
        tweet.avatarUrl = avatarUrl;
        chrome.storage.local.set({ tweets });
      }
    });
  }

  function tryCapture() {
    if (dead || !isAlive()) return;
    if (!isStatusPage()) return;

    // Wait for the tweet to render
    const tweet = extractMainTweet();
    if (tweet) {
      saveTweet(tweet);

      // If no avatar, retry after delay to catch lazy-loaded avatars
      if (!tweet.avatarUrl) {
        setTimeout(() => {
          const url = findAvatarForTweet(tweet.tweetId);
          if (url) updateAvatar(tweet.tweetId, url);
        }, 2000);
      }
    } else {
      // Tweet might not have rendered yet, retry once
      setTimeout(() => {
        if (dead) return;
        const tweet = extractMainTweet();
        if (tweet) saveTweet(tweet);
      }, 1000);
    }
  }

  // Detect SPA navigation by watching URL changes
  function watchUrlChange() {
    if (dead) return;
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      tryCapture();
    }
  }

  // MutationObserver to detect SPA navigation (throttled)
  let observerTimer = null;
  const observer = new MutationObserver(() => {
    if (observerTimer) return;
    observerTimer = setTimeout(() => {
      observerTimer = null;
      watchUrlChange();
    }, 200);
  });

  const target = document.querySelector('#react-root') || document.body;
  observer.observe(target, { childList: true, subtree: true });

  // Also check periodically as a fallback
  const intervalId = setInterval(() => {
    if (dead) { clearInterval(intervalId); observer.disconnect(); return; }
    watchUrlChange();
  }, 1000);

  // Initial check
  lastUrl = location.href;
  tryCapture();

  console.log('[X Timeline History] content.js loaded — recording tweets you visit');
})();
