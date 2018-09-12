import { mkdirPromise, readdirPromise } from './fs-promise';

export async function createDirIfNotExist(dir: string): Promise<void> {
  try {
    await readdirPromise(dir);
  } catch (err) {
    await mkdirPromise(dir);
  }
}
