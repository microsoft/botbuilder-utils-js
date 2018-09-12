import { mkdir, readdir, writeFile } from 'fs';

/**
 * Write a file using Promise
 * @param path path to write file
 * @param data content to write to the file
 */
export const writeFilePromise = (path: string, data: string) => new Promise<void>((resolve, reject) => {
  writeFile(path, data, (err) => {
    if (err) { return reject(err); }
    resolve();
  });
});

/**
 * List files in a directory using Promise
 * @param path path to read
 */
export const readdirPromise = (path: string) => new Promise<any>((resolve, reject) => {
  readdir(path, (err, files) => {
    if (err) { return reject(err); }
    resolve(files);
  });
});

/**
 * Create directory using Promise
 * @param path Directory to create
 */
export const mkdirPromise = (path: string) => new Promise<any>((resolve, reject) => {
  mkdir(path, (err) => {
    if (err) { return reject(err); }
    resolve();
  });
});
