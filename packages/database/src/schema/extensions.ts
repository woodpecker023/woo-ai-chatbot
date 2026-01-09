import { customType } from 'drizzle-orm/pg-core';

// Custom vector type for pgvector
export const vector = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: string;
}>({
  dataType(config) {
    return `vector(${config.dimensions})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(',')
      .map((v) => parseFloat(v));
  },
});
