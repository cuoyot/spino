import { processScore } from './library-pipeline.js';

self.onmessage = async ({ data }) => {
  try { self.postMessage({ result: await processScore(data.asset, data.record, data.options) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
