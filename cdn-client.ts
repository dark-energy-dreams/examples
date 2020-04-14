import * as path from 'path';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as url from 'url';
import * as https from 'https';

export interface Options {
  hostname: string;
  port: number;
  path: string;
  method: string;
  token: string;
  downloadLinkPart: string;
  folder: string;
  uploadAttemptsLimit?: number;
}

/**
 * Класс для загрузки файлов на CDN
 */
export class CdnClient {
  private static instance: CdnClient;

  private readonly hostname: string;

  private readonly port: number;

  private readonly path: string;

  private readonly method: string;

  private readonly token: string;

  private readonly downloadLinkPart: string;

  private readonly folder: string;

  private readonly uploadAttemptsLimit: number;

  public constructor(options?: Options) {
    if (CdnClient.instance && !options) {
      return CdnClient.instance;
    }
    this.hostname = options.hostname;
    this.port = options.port;
    this.path = options.path;
    this.method = options.method;
    this.token = options.token;
    this.downloadLinkPart = options.downloadLinkPart;
    this.folder = options.folder || '';
    this.uploadAttemptsLimit = options.uploadAttemptsLimit || 1;
    CdnClient.instance = this;
  }

  /**
   * Метод, который по пути файла в локальной ФС отправляет его на CDN
   * @param pathToFile
   */
  public async upload(pathToFile: string): Promise<string> {
    /**
     * Инициализируем счетчик попыток отправки файла на CDN
     * (если не определен при создании инстанса, то 1)
     */
    let uploadAttemptsCounter = 1;
    let link: string;
    while (uploadAttemptsCounter <= this.uploadAttemptsLimit) {
      console.log(
        `Upload file ${path.basename(
          pathToFile,
        )} to CDN. Attempt: ${uploadAttemptsCounter}`,
      );
      try {
        link = await new Promise((resolve, reject) => {
          const form = new FormData();
          form.append('folder', this.folder.replace('/', ''));
          form.append('upfile', fs.createReadStream(pathToFile));

          const options = {
            hostname: this.hostname,
            port: this.port,
            path: this.path,
            method: this.method,
            headers: {
              token: this.token,
              'Content-Type': 'application/json',
              ...form.getHeaders(),
            },
          };
          const req = https.request(options);
          form.pipe(req);

          req.on('response', (res) => {
            let data: string;
            res.on('data', (chunk) => {
              data = chunk.toString('utf8');
            });

            res.on('end', () => {
              let name;
              try {
                const response = JSON.parse(data);
                name = response.name;

                /**
                 * Пробрасываем объект с ошибкой
                 */
                if (!name) {
                  return reject(
                    new Error(
                      `CDN error. Response: "${JSON.stringify(response)}"`,
                    ),
                  );
                }
              } catch (e) {
                /**
                 * Пробрасываем html с ошибкой
                 */
                return reject(new Error(`CDN error. Response: "${data}"`));
              }
              const link = url.resolve(
                url.resolve(this.downloadLinkPart, this.folder),
                name,
              );
              resolve(link);
            });
          });

          req.on('error', (error) => {
            console.error(error);
            reject(error);
          });
        });
      } catch (error) {
        console.error(error);
        uploadAttemptsCounter += 1;
        continue; // ошибка. пробуем еще раз
      }
      break; // мы получили ссылку выходим из цикла
    }
    if (link) {
      return link;
    }
    throw new Error(
      `CDN error. Can't upload file ${path.basename(pathToFile)}`,
    );
  }
}
