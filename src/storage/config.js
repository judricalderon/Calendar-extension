// src/storage/config.js

/**
 * Saves the scheduler configuration object into Chrome's synced storage.
 * Uses chrome.storage.sync so settings persist across browsers where the user
 * is logged in with the same Google account.
 *
 * @param {Object} config - Key-value configuration object for the scheduler.
 * @returns {Promise<boolean>} Resolves true once the operation completes.
 */
export function saveConfig(config) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ schedulerConfig: config }, () => resolve(true));
  });
}
/**
 * Loads the scheduler configuration from Chrome's synced storage.
 * If no configuration is found, an empty object is returned.
 *
 * @returns {Promise<Object>} A resolved configuration object.
 */
export function loadConfig() {
  return new Promise(resolve => {
    chrome.storage.sync.get("schedulerConfig", data => {
      resolve(data.schedulerConfig || {});
    });
  });
}
