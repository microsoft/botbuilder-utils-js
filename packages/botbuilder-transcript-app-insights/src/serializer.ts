// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const MAX_KEY_SIZE = 150;
const MAX_VALUE_SIZE = 8192;
const KEY_META_PREFIX = '$';
const KEY_STRING_PREFIX = '_';
const DATE_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

export interface EventProperties {
  [key: string]: string;
}

/**
 * Serialize an object into key/value pairs.
 *   Non-string values will be changed to use a prefix of '_'
 *   Callers can add new properties to the returned object using keys prefixed with '$' to denote properties that will not be deserialized.
 * @param obj Any object
 */
export function serialize(obj: any): EventProperties {
  const event: EventProperties = {};
  for (const prop of Object.getOwnPropertyNames(obj)) {
    if (prop.length > MAX_KEY_SIZE) {
      console.warn('Skipping transcript serialization of large key');
      continue;
    }

    const value = obj[prop];

    // string values should not be JSON stringified
    const isstr = typeof value === 'string';
    const key = isstr ? prop : KEY_STRING_PREFIX + prop;
    const strval = isstr ? obj[prop] : JSON.stringify(obj[prop]);
    if (strval.length > MAX_VALUE_SIZE) {
      console.warn('Skipping transcript serialization of large value');
      continue;
    }

    event[key] = strval;
  }
  return event;
}

export function serializeMetadata(event: EventProperties, properties: EventProperties): EventProperties {
  for (const key of Object.getOwnPropertyNames(properties)) {
    event[KEY_META_PREFIX + key] = properties[key];
  }
  return properties;
}

export function deserialize<T>(event: EventProperties): T {
  const obj: any = {};

  for (const prop of Object.getOwnPropertyNames(event)) {
    // keys with $ prefix should not be deserialized
    if (!prop.startsWith(KEY_META_PREFIX)) {

      // keys with _ prefix are already strings and should not be JSON-parsed
      const isstr = !prop.startsWith(KEY_STRING_PREFIX);
      const strval = event[prop];
      const key = isstr ? prop : prop.substr(KEY_STRING_PREFIX.length);
      const value = isstr ? strval : JSON.parse(strval);
      obj[key] = DATE_RE.test(value) ? new Date(value) : value;
    }
  }

  return obj as T;
}
