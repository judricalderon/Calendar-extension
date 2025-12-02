// src/storage/config.js

export function saveConfig(config) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ schedulerConfig: config }, () => resolve(true));
  });
}

export function loadConfig() {
  return new Promise(resolve => {
    chrome.storage.sync.get("schedulerConfig", data => {
      resolve(data.schedulerConfig || {});
    });
  });
}
