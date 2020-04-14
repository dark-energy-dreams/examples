import { EOL } from 'os';
import { Worker } from 'worker_threads';

interface Options {
  debug: boolean;
}

/**
 * Код воркера, который будет запускаться
 */
const workerCode = `
  const { parse, resolve } = require('path');
  const { workerData, parentPort } = require('worker_threads');

  (async function() {
    if (
      !Object.hasOwnProperty.call(workerData, 'path') ||
      !Object.hasOwnProperty.call(workerData, 'method')
    ) {
      throw new Error(
        'Invalid worker data! It must contain next fields: "path" - path to module than will be import, "method" - method, that will be call',
      );
    }
    const moduleExtension = parse(workerData.path).ext;

    if (moduleExtension === '.ts') {
      require('ts-node').register();
    } else if (moduleExtension !== '.js') {
      throw new Error(
        "Invalid module extension " + moduleExtension + "of module " + workerData.path,
      );
    }

    const moduleToExecute = require(workerData.path);

    process.on('uncaughtException', (err) => {
        console.error('Error in worker thread:', err);
        process.exit(1);
    });
    process.on('unhandledRejection', (err) => {
        console.error('Error in worker thread:', err);
        process.exit(1);
    });

    try {
      if (!Object.hasOwnProperty.call(moduleToExecute, workerData.method)) {
        throw new Error(
          "Can not find " + workerData.method + "function in module " + workerData.path,
        );
      }

      const result = await moduleToExecute[workerData.method](...(workerData.args || []));
      parentPort.postMessage({
        error: false,
        message: result,
      });
      process.exit(0);
    } catch (err) {
      console.error('Error in worker thread:', err);
      parentPort.postMessage({
        error: true,
        message: err.stack || err,
      });
      process.exit(1);
    }
  })();
`;

/**
 * Возвращает путь к модулю, в котором был вызвана функция в которой вызывается
 * getCaller()
 */
function getCaller(): string {
  const result = new Error().stack
    .split(EOL)[3]
    .replace('\t', '')
    .split('(')[1]
    .split(':');
  return result[result.length - 3].trim();
}

/**
 * Функция позволяет запускать методы модулей в worker thread. Для того, чтобы
 * запустить любую функцию любого модуля в потоке, необходимо в нужном модуле
 * запустить initModuleForThread(). Псле вызова initModuleForThread() в модуле
 * определится функция __execInThread(functionName, ...args).
 * Пример:
 *
 * # /src/first-module.ts
 * import { initModuleForThread } from 'run-in-thread';
 * import * as os from 'os'; // Можно импортировать любые модули, в том числе и кастомные
 *
 * initModuleForThread(); // Здесь происходит определение функции __execInThread()
 *
 * export function someFunc(a: string, b: number) {
 *   ... // Тут любой код
 * }
 *
 * # /src/second-module.ts
 *
 * import * as firstModule from './first-module';
 *
 * // С помошью __execInThread можно вызывать функции модуля в потоке указав
 * // в первом аргументе имя функции, а в последующих аргумента, те данные,
 * // которые будут переданы в аргументы вызываемой функции.
 * // __execInThread возвращает Promise
 * firstModule.__execInThread('someFunc', 'somestring', 3423)
 *    .then((result) => {
 *      logger.info(result);
 *    })
 *    .catch((err) => {
 *      logger.error(err);
 *    })
 *
 * @param options
 */
export const initModuleForThread = (options?: Options) => {
  const debug = (options && options.debug) || false;
  const pathToFile = getCaller();
  const callerModule = require(pathToFile);
  console.log(
    `RUN_IN_THREAD_LIB: A module "${pathToFile}" was initialized for running in worker thread`,
  );
  callerModule.__execInThread = async (methodName: string, ...args) => {
    const methodArgs = args || [];
    if (debug) {
      const parentModule = require(pathToFile);
      if (!Object.hasOwnProperty.call(parentModule, methodName)) {
        throw new Error(
          `Can not find such method "${methodName}" in module file!`,
        );
      }
      return parentModule[methodName](...methodArgs);
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(workerCode, {
        eval: true,
        workerData: {
          path: pathToFile,
          method: methodName,
          args: methodArgs,
        },
      });
      worker.on('message', (msg) => {
        if (msg.error) {
          reject(msg.message);
        } else {
          resolve(msg.message);
        }
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        } else {
          resolve();
        }
      });
    });
  };
};
