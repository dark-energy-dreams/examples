interface StoreInterface {
  storeId: string;
  cityFiasId: string;
  workTimes: {
    weeks: {
      [day: string]: [number, number];
    };
  };
}

export interface ClosingTimeMap {
  [fias: string]: number;
}

/**
 * Определяем областной фиас
 * @param fias фиас
 */
function isDistrict(fias: string): boolean {
  return fias
    .slice(2)
    .split('')
    .some((x) => x !== '0');
}

const MAX_CLOSE_TIME = 24;

/**
 * Функция для создания карты минимального времени закрытия магазина в рамках фиаса фиас
 * @param stores магазины
 * @param fiases фиасы
 */
function createClosingTimeMap(
  stores: StoreInterface[],
  fiases: string[],
): ClosingTimeMap {
  const closingTimeMap = {};
  for (const fias of fiases) {
    /**
     * Собираем магазины по конкретному фиасу
     */
    let storesByFias = [];
    if (isDistrict(fias)) {
      storesByFias = stores.filter((x) =>
        new RegExp(`^${fias.slice(0, 2)}`).test(x.cityFiasId),
      );
    } else {
      storesByFias = stores.filter((x) => x.cityFiasId === fias);
    }
    closingTimeMap[fias] = storesByFias.reduce(
      /**
       * Бежим по магазинам
       * @param minTime минимальное время закрытия по всем магазинам фиаса
       * @param store магазин
       */
      (minTime: number, store: StoreInterface) => {
        const {
          workTimes: { weeks },
        } = store;
        return Object.values(weeks).reduce(
          /**
           * Бежим по дням недели в магазине
           * @param minWeekTime минимальное время закрытия магазина
           * @param schedule график [открытие(10), закрытие(22)]
           */
          (minWeekTime: number, schedule: [number, number]) => {
            const [, closeTime] = schedule;
            const formattedCloseTime: number = closeTime !== 0 ? closeTime : 24;
            return Math.min(formattedCloseTime, minWeekTime);
          },
          MAX_CLOSE_TIME,
        );
      },
      MAX_CLOSE_TIME,
    );
  }

  return closingTimeMap;
}
