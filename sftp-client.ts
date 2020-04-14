import * as Client from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface Options {
  host: string;
  port: number;
  login: string;
  password: string;
  path: string;
}

/**
 * Класс для загрузки и скачивания файлов с SFTP
 */
export class SftpClient {
  private static instance: SftpClient;

  private readonly host: string;

  private readonly port: number;

  private readonly login: string;

  private readonly password: string;

  private readonly path: string;

  private sftpClient: Client;

  public constructor(options?: Options) {
    if (SftpClient.instance && !options) {
      return SftpClient.instance;
    }
    this.host = options.host;
    this.port = options.port;
    this.login = options.login;
    this.password = options.password;
    this.path = options.path;
    this.sftpClient = new Client();

    SftpClient.instance = this;
  }

  /**
   * Метод преверяет соединение с SFTP сервером
   * @param showResources если true, то выведет в терминал список файлов и директорий
   * по умолчанию true
   */
  public async testConnection(showResources: boolean = true): Promise<void> {
    logger.info(`Connecting to SFTP: ${this.host}:${this.port}${this.path}`);
    await this.createConnection();
    logger.info('SFTP client was successfully connected!');
    if (showResources) {
      const list = await this.sftpClient.list(this.path);
      logger.info(
        'Resource list: ',
        JSON.stringify(list.map((res) => res.name), null, 2),
      );
    }
    await this.closeConnection();
  }

  /**
   * Метод загружает данные с sftp в локальную директорию
   * @param pathToLocalFile путь к файлу для выгрузки
   * @param pathToRemoteDir путь к директории на SFTP сервере
   */
  public async download(
    pathToRemoteFile: string,
    pathToLocalFile: string,
  ): Promise<void> {
    await this.createConnection();
    await this.sftpClient.fastGet(
      path.join(this.path, pathToRemoteFile),
      pathToLocalFile,
    );
    await this.closeConnection();
  }

  /**
   * Метод выгружает данные на sftp
   * @param pathToLocalFile путь к файлу для выгрузки
   * @param pathToRemoteDir путь к директории на SFTP сервере
   */
  public async upload(
    pathToLocalFile: string,
    pathToRemoteDir: string = '',
  ): Promise<string> {
    let message;
    const filename = path.basename(pathToLocalFile);
    try {
      await this.createConnection();
      message = await this.sftpClient.put(
        fs.createReadStream(pathToLocalFile),
        path.join(this.path, pathToRemoteDir, filename),
      );
    } catch (err) {
      throw new Error(
        `Can't upload file "${filename}" to SFTP; Reason: ${err}`,
      );
    } finally {
      await this.closeConnection();
    }
    return message;
  }

  private async closeConnection(): Promise<void> {
    await this.sftpClient.end();
    this.sftpClient = new Client();
  }

  private async createConnection(): Promise<void> {
    await this.sftpClient.connect({
      host: this.host,
      port: this.port,
      username: this.login,
      password: this.password,
    });
  }
}
