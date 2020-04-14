import * as path from 'path';
import * as fs from 'fs';

/**
 * Функция для создает название и путь к файлу по фиасу
 * @param fias фиас годода/области
 */
function generatePath(fias: string): string {
  let filename: string;
  switch (process.env.NODE_ENV) {
    case 'production':
      filename = `ru-${fias}-mb-offers.xml`;
    case 'test':
      filename = `test-ru-${fias}-mb-offers.xml`;
    case 'development':
      filename = `dev-ru-${fias}-mb-offers.xml`;
    default:
      filename = `dev-ru-${fias}-mb-offers.xml`;
  }
  const folder = path.join(process.cwd(), 'files');
  return path.join(folder, filename);
}

/**
 * Функция, которая создает файлы по фиасам
 * @param fiases фиасы
 */
async function createFilesByFiases(fiases: string[]): Promise<string[]> {
  const promises = [];
  for (const fias of fiases) {
    const path = generatePath(fias);
    promises.push(
      new Promise((resolve, reject) => {
        fs.writeFile(path, '', (err) => {
          if (err) reject(err);
          resolve(path);
        });
      }),
    );
  }
  const paths = await Promise.all(promises);
  if (fiases.length !== paths.length) {
    throw new Error('Сиситема не смогла создать файлы для все фиасов');
  }
  return paths;
}