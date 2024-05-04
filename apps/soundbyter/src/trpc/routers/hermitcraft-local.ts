import { getHermitcraftChannels } from '../../../drizzle/db';
import { publicProcedure } from '../trpc';

export const getHermitsLocal = publicProcedure.query(async () => {
  const result = await getHermitcraftChannels();
  return result;
});
