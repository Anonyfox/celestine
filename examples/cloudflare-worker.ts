import { calculateChart, time } from 'celestine';

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const params = new URL(request.url).searchParams;
      const date = params.get('date') ?? '';
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) {
        throw new RangeError('date must be YYYY-MM-DDTHH:MM (local time)');
      }
      const [year, month, day, hour, minute] = date.split(/[-T:]/).map(Number);
      const numeric = (key: string, min: number, max: number): number => {
        const raw = params.get(key);
        const value = Number(raw);
        if (
          raw === null ||
          raw.trim() === '' ||
          !Number.isFinite(value) ||
          value < min ||
          value > max
        ) {
          throw new RangeError(`Invalid ${key}`);
        }
        return value;
      };
      const birth = {
        year: year!,
        month: month!,
        day: day!,
        hour: hour!,
        minute: minute!,
        second: 0,
        timezone: numeric('tz', -14, 14),
        latitude: numeric('lat', -90, 90),
        longitude: numeric('lon', -180, 180),
      };
      if (
        !time.isValidDate(birth.year, birth.month, birth.day) ||
        birth.hour > 23 ||
        birth.minute > 59
      ) {
        throw new RangeError('Invalid calendar date or time');
      }
      // Civil birth time and offset go directly to the chart API; it handles time scales.
      return Response.json(calculateChart(birth, { houseSystem: 'placidus' }));
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid input' },
        { status: 400 },
      );
    }
  },
};
