import { STORAGE_AREAS } from "../../shared/constants.js";

function getChromeStorage(area) {
  return globalThis.chrome?.storage?.[area] || null;
}

function getRuntimeErrorMessage() {
  return globalThis.chrome?.runtime?.lastError?.message || null;
}

function parseStoredValue(rawValue) {
  if (typeof rawValue !== "string") {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function serializeValue(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function readFromLocalStorage(keys) {
  if (!globalThis.localStorage) {
    return {};
  }

  if (keys == null) {
    return {};
  }

  if (typeof keys === "string") {
    return {
      [keys]: parseStoredValue(globalThis.localStorage.getItem(keys)),
    };
  }

  if (Array.isArray(keys)) {
    return keys.reduce((acc, key) => {
      acc[key] = parseStoredValue(globalThis.localStorage.getItem(key));
      return acc;
    }, {});
  }

  if (typeof keys === "object") {
    return Object.keys(keys).reduce((acc, key) => {
      const value = globalThis.localStorage.getItem(key);
      acc[key] = value === null ? keys[key] : parseStoredValue(value);
      return acc;
    }, {});
  }

  return {};
}

function writeToLocalStorage(entries) {
  if (!globalThis.localStorage) {
    return;
  }

  Object.entries(entries).forEach(([key, value]) => {
    const serialized = serializeValue(value);
    if (serialized === null) {
      globalThis.localStorage.removeItem(key);
      return;
    }

    globalThis.localStorage.setItem(key, serialized);
  });
}

export async function getFromStorage(keys, options = {}) {
  const area = options.area || STORAGE_AREAS.SYNC;
  const storage = getChromeStorage(area);

  if (!storage) {
    return readFromLocalStorage(keys);
  }

  return new Promise((resolve, reject) => {
    storage.get(keys, (result) => {
      const errorMessage = getRuntimeErrorMessage();
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }

      resolve(result || {});
    });
  });
}

export async function setToStorage(values, options = {}) {
  const area = options.area || STORAGE_AREAS.SYNC;
  const storage = getChromeStorage(area);

  if (!storage) {
    writeToLocalStorage(values);
    return;
  }

  return new Promise((resolve, reject) => {
    storage.set(values, () => {
      const errorMessage = getRuntimeErrorMessage();
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }

      resolve();
    });
  });
}

export async function removeFromStorage(keys, options = {}) {
  const area = options.area || STORAGE_AREAS.SYNC;
  const storage = getChromeStorage(area);

  if (!storage) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => globalThis.localStorage?.removeItem(key));
    return;
  }

  return new Promise((resolve, reject) => {
    storage.remove(keys, () => {
      const errorMessage = getRuntimeErrorMessage();
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }

      resolve();
    });
  });
}

export async function clearStorage(options = {}) {
  const area = options.area || STORAGE_AREAS.SYNC;
  const storage = getChromeStorage(area);

  if (!storage) {
    globalThis.localStorage?.clear();
    return;
  }

  return new Promise((resolve, reject) => {
    storage.clear(() => {
      const errorMessage = getRuntimeErrorMessage();
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }

      resolve();
    });
  });
}

export async function getStorageValue(key, options = {}) {
  const defaultValue = options.defaultValue;
  const result = await getFromStorage({ [key]: defaultValue }, options);
  return result[key];
}
