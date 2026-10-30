import { buildSite } from './lib.mjs';

buildSite().catch((err) => {
  console.error(err);
  process.exit(1);
});
