const defaultSettings = {
  language: 'en',
  cloakUrl: 'about:blank',
  favicon: 'https://i.pinimg.com/1200x/25/ca/fb/25cafbf386823ddb172d0f5b24384c08.jpg',
  pageTitle: 'Moon Proxy',
  accent: '#9f7fff',
  showBadge: true,
  hoverAnimations: true,
  showSidebar: true,
  splash: true,
};

const updates = [
  {
    version: 'v0.0.1',
    date: '2026-05-20',
    details: 'Initial release with built-in proxy emulator, sidebar navigation, settings panel, and custom moon cursor.',
  },
];

const strings = {
  en: {
    homeSubtitle: 'Type a valid link like example.com or a full URL to open inside the built-in emulator.',
    settingsHint: 'Settings are saved instantly and will apply across the site. Try entering https://example.com or example.com.',
    updateTitle: 'Update Log',
  },
  es: {
    homeSubtitle: 'Escriba un enlace válido como example.com o una URL completa para abrirla dentro del emulador integrado.',
    settingsHint: 'La configuración se guarda al instante y se aplica en todo el sitio. Prueba con https://example.com o example.com.',
    updateTitle: 'Registro de Actualizaciones',
  },
};

const storageKey = 'moonProxySettings';
const seenUpdatesKey = 'moonProxySeenUpdates';

const elements = {};

function $(selector) {
  return document.querySelector(selector);
}

function init() {
  elements.pages = document.querySelectorAll('.page');
  elements.sidebarButtons = document.querySelectorAll('.sidebar-button');
  elements.searchForm = $('#searchForm');
  elements.searchInput = $('#searchInput');
  elements.browserUrlLabel = $('#browserUrlLabel');
  elements.proxyIframe = $('#proxyIframe');
  elements.homeButton = $('#homeButton');
  elements.languageSelect = $('#languageSelect');
  elements.cloakInput = $('#cloakInput');
  elements.faviconInput = $('#faviconInput');
  elements.titleInput = $('#titleInput');
  elements.themeAccent = $('#themeAccent');
  elements.badgeToggle = $('#badgeToggle');
  elements.hoverAnimationsToggle = $('#hoverAnimationsToggle');
  elements.sidebarToggle = $('#sidebarToggle');
  elements.loadingToggle = $('#loadingToggle');
  elements.updateList = $('#updateList');
  elements.updateBadge = $('#updateBadge');
  elements.modelBadge = $('#modelBadge');
  elements.toast = $('#toast');
  elements.loadingOverlay = $('#loadingOverlay');

  bindEvents();
  loadSettings();
  renderUpdateLog();
  applySettings(true);
  if (settings.splash) {
    setTimeout(() => hideLoading(), 1400);
  } else {
    hideLoading(true);
  }
}

function bindEvents() {
  elements.sidebarButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const page = button.dataset.page;
      openPage(page);
    });
  });

  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    openProxy(elements.searchInput.value.trim());
  });

  elements.homeButton.addEventListener('click', () => openPage('home'));

  elements.languageSelect.addEventListener('change', updateSettingsFromUI);
  elements.cloakInput.addEventListener('change', updateSettingsFromUI);
  elements.faviconInput.addEventListener('change', updateSettingsFromUI);
  elements.titleInput.addEventListener('change', updateSettingsFromUI);
  elements.themeAccent.addEventListener('input', updateSettingsFromUI);
  elements.badgeToggle.addEventListener('change', updateSettingsFromUI);
  elements.hoverAnimationsToggle.addEventListener('change', updateSettingsFromUI);
  elements.sidebarToggle.addEventListener('change', updateSettingsFromUI);
  elements.loadingToggle.addEventListener('change', updateSettingsFromUI);

  elements.proxyIframe.addEventListener('load', () => {
    hideLoading();
  });
}

let settings = { ...defaultSettings };

function loadSettings() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      settings = { ...defaultSettings, ...JSON.parse(saved) };
    } catch (error) {
      settings = { ...defaultSettings };
    }
  }

  elements.languageSelect.value = settings.language;
  elements.cloakInput.value = settings.cloakUrl;
  elements.faviconInput.value = settings.favicon;
  elements.titleInput.value = settings.pageTitle;
  elements.themeAccent.value = settings.accent;
  elements.badgeToggle.checked = settings.showBadge;
  elements.hoverAnimationsToggle.checked = settings.hoverAnimations;
  elements.sidebarToggle.checked = settings.showSidebar;
  elements.loadingToggle.checked = settings.splash;
}

function saveSettings() {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

function updateSettingsFromUI() {
  settings.language = elements.languageSelect.value;
  settings.cloakUrl = elements.cloakInput.value || 'about:blank';
  settings.favicon = elements.faviconInput.value || defaultSettings.favicon;
  settings.pageTitle = elements.titleInput.value || 'Moon Proxy';
  settings.accent = elements.themeAccent.value;
  settings.showBadge = elements.badgeToggle.checked;
  settings.hoverAnimations = elements.hoverAnimationsToggle.checked;
  settings.showSidebar = elements.sidebarToggle.checked;
  settings.splash = elements.loadingToggle.checked;
  saveSettings();
  applySettings();
  showToast('Settings saved.');
}

function applySettings(initial = false) {
  document.documentElement.style.setProperty('--accent', settings.accent);
  document.documentElement.style.setProperty('--accent-strong', shadeColor(settings.accent, 16));
  document.body.classList.toggle('no-hover', !settings.hoverAnimations);
  document.querySelector('.sidebar').style.display = settings.showSidebar ? 'flex' : 'none';
  document.title = settings.pageTitle || 'Moon Proxy';
  $('#faviconLink').href = settings.favicon || defaultSettings.favicon;
  $('#browserUrlLabel').textContent = settings.cloakUrl || 'about:blank';
  $('.home-brand p').textContent = strings[settings.language]?.homeSubtitle || strings.en.homeSubtitle;
  $('.setting-hint p').textContent = strings[settings.language]?.settingsHint || strings.en.settingsHint;
  $('#updates h2').textContent = strings[settings.language]?.updateTitle || strings.en.updateTitle;
  elements.modelBadge.style.display = settings.showBadge ? 'block' : 'none';
  if (initial && settings.cloakUrl && settings.cloakUrl !== 'about:blank') {
    openProxy(settings.cloakUrl, true);
  }
}

function openPage(pageId) {
  elements.pages.forEach((page) => page.classList.toggle('active', page.id === pageId));
  elements.sidebarButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.page === pageId);
  });
}

function openProxy(value, silent = false) {
  if (!value) {
    showToast('Enter a valid link or URL.');
    return;
  }
  const url = normalizeUrl(value);
  if (!url) {
    showToast('That link is not valid. Try again with a .com, .net, or full URL.');
    return;
  }
  if (!silent) openPage('home');
  showLoading();
  elements.browserUrlLabel.textContent = url;
  elements.proxyIframe.src = url;
}

function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (trimmed.match(/^(about:blank)$/i)) return 'about:blank';
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }
  if (/^[\w-]+(\.[\w-]+)+([\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

function renderUpdateLog() {
  const seen = Number(localStorage.getItem(seenUpdatesKey) || 0);
  const newestIndex = updates.length;

  elements.updateList.innerHTML = updates
    .slice()
    .reverse()
    .map((update) => {
      return `<li><strong>${update.version}</strong><span>${update.date}</span><p>${update.details}</p></li>`;
    })
    .join('');

  if (newestIndex > seen) {
    elements.updateBadge.style.display = 'inline-flex';
  } else {
    elements.updateBadge.style.display = 'none';
  }

  localStorage.setItem(seenUpdatesKey, newestIndex);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

function showLoading() {
  if (!settings.splash) return;
  elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading(force = false) {
  if (force) {
    elements.loadingOverlay.classList.add('hidden');
    return;
  }
  setTimeout(() => {
    elements.loadingOverlay.classList.add('hidden');
  }, 220);
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(R << 16 | G << 8 | B).toString(16).padStart(6, '0')}`;
}

window.addEventListener('load', init);
