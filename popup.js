const PAGE_SIZE = 50;
let currentOffset = 0;
let currentKeyword = '';
let allTweets = [];
let viewMode = 'compact'; // 'compact' or 'full'

const searchInput = document.getElementById('searchInput');
const tweetCountEl = document.getElementById('tweetCount');
const clearBtn = document.getElementById('clearBtn');
const viewToggle = document.getElementById('viewToggle');
const tweetList = document.getElementById('tweetList');
const loadMoreBtn = document.getElementById('loadMoreBtn');

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '...' : text;
}

function formatTime(ms) {
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return h + ':' + m;
}

function getDateLabel(ms) {
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const tweetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (tweetDay.getTime() === today.getTime()) return 'Today';
  if (tweetDay.getTime() === yesterday.getTime()) return 'Yesterday';

  const month = d.toLocaleString('en', { month: 'short' });
  return month + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function renderCompactTweet(tweet) {
  const avatarHtml = tweet.avatarUrl
    ? '<img src="' + escapeHtml(tweet.avatarUrl) + '" alt="">'
    : '<div class="avatar-initial">' + getInitial(tweet.authorName) + '</div>';

  const hasImg = tweet.images && tweet.images.length > 0;
  const imgIcon = hasImg ? '<span class="media-icon" title="Has images">🖼</span>' : '';

  return '<article class="tweet-item compact" data-url="' + escapeHtml(tweet.tweetUrl) + '" data-id="' + tweet.tweetId + '">' +
    '<div class="avatar-sm">' + avatarHtml + '</div>' +
    '<div class="compact-body">' +
      '<div class="compact-header">' +
        '<span class="tweet-author">' + escapeHtml(tweet.authorName) + '</span>' +
        '<span class="compact-time">' + formatTime(tweet.savedAt) + '</span>' +
      '</div>' +
      '<div class="compact-preview">' +
        imgIcon +
        '<span class="preview-text">' + escapeHtml(truncate(tweet.content, 60)) + '</span>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function renderExpandedTweet(tweet) {
  const avatarHtml = tweet.avatarUrl
    ? '<img src="' + escapeHtml(tweet.avatarUrl) + '" alt="">'
    : '<div class="avatar-initial">' + getInitial(tweet.authorName) + '</div>';

  const imgCount = tweet.images ? tweet.images.length : 0;
  const imgClass = imgCount === 1 ? 'tweet-images single-image' : 'tweet-images';
  const imagesHtml = imgCount > 0
    ? '<div class="' + imgClass + '">' + tweet.images.map(
        (url) => '<img src="' + escapeHtml(url) + '" alt="" loading="lazy">'
      ).join('') + '</div>'
    : '';

  return '<article class="tweet-item expanded" data-url="' + escapeHtml(tweet.tweetUrl) + '" data-id="' + tweet.tweetId + '">' +
    '<div class="avatar">' + avatarHtml + '</div>' +
    '<div class="tweet-content-wrapper">' +
      '<div class="tweet-header">' +
        '<span class="tweet-author">' + escapeHtml(tweet.authorName) + '</span>' +
        '<span class="tweet-handle">@' + escapeHtml(tweet.authorHandle) + '</span>' +
      '</div>' +
      '<p class="tweet-text">' + escapeHtml(tweet.content) + '</p>' +
      imagesHtml +
      '<div class="read-time">' + formatTime(tweet.savedAt) + '</div>' +
    '</div>' +
  '</article>';
}

function getFilteredTweets() {
  if (!currentKeyword) return allTweets;
  const kw = currentKeyword.toLowerCase();
  return allTweets.filter(t =>
    t.content.toLowerCase().includes(kw) ||
    t.authorName.toLowerCase().includes(kw) ||
    t.authorHandle.toLowerCase().includes(kw)
  );
}

function renderList(reset) {
  if (reset) {
    currentOffset = 0;
    tweetList.innerHTML = '';
  }

  const filtered = getFilteredTweets();
  const page = filtered.slice(currentOffset, currentOffset + PAGE_SIZE);

  if (page.length > 0) {
    let html = '';
    let lastDateLabel = '';

    // Get the last date label already rendered
    if (currentOffset > 0) {
      const headers = tweetList.querySelectorAll('.date-header');
      if (headers.length > 0) lastDateLabel = headers[headers.length - 1].textContent;
    }

    for (const tweet of page) {
      const dateLabel = getDateLabel(tweet.savedAt);
      if (dateLabel !== lastDateLabel) {
        html += '<div class="date-header">' + dateLabel + '</div>';
        lastDateLabel = dateLabel;
      }
      html += viewMode === 'compact' ? renderCompactTweet(tweet) : renderExpandedTweet(tweet);
    }

    tweetList.insertAdjacentHTML('beforeend', html);
    currentOffset += page.length;
  }

  loadMoreBtn.style.display = currentOffset < filtered.length ? 'block' : 'none';

  if (currentOffset === 0 && page.length === 0) {
    tweetList.innerHTML = '<div class="empty-state">No tweets recorded yet.<br>Click into tweets on X and they will appear here.</div>';
  }
}

function loadData() {
  chrome.storage.local.get({ tweets: [] }, (result) => {
    allTweets = result.tweets;
    tweetCountEl.textContent = allTweets.length.toLocaleString();
    renderList(true);
  });
}

// Click tweet → open original
tweetList.addEventListener('click', (e) => {
  const item = e.target.closest('.tweet-item');
  if (!item || !item.dataset.url) return;
  const url = item.dataset.url;
  if (!url.startsWith('https://x.com/')) return;
  chrome.tabs.create({ url });
});

// View mode toggle
const COMPACT_ICON = '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>';
const FULL_ICON = '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>';

viewToggle.addEventListener('click', () => {
  viewMode = viewMode === 'compact' ? 'full' : 'compact';
  document.getElementById('viewIcon').innerHTML = viewMode === 'compact' ? COMPACT_ICON : FULL_ICON;
  chrome.storage.local.set({ viewMode });
  renderList(true);
});

// Load saved view preference
chrome.storage.local.get({ viewMode: 'compact' }, (result) => {
  viewMode = result.viewMode;
  document.getElementById('viewIcon').innerHTML = viewMode === 'compact' ? COMPACT_ICON : FULL_ICON;
});

// Search
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentKeyword = searchInput.value.trim();
    renderList(true);
  }, 300);
});

// Load more
loadMoreBtn.addEventListener('click', () => renderList(false));

// Clear cache
clearBtn.addEventListener('click', () => {
  if (confirm('Clear all saved tweets? This cannot be undone.')) {
    chrome.storage.local.remove('tweets', () => {
      allTweets = [];
      currentOffset = 0;
      tweetList.innerHTML = '<div class="empty-state">Cache cleared.</div>';
      loadMoreBtn.style.display = 'none';
      tweetCountEl.textContent = '0';
    });
  }
});

// Init
loadData();
