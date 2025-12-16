/**
 * CLI 命令导出
 */

export { runGenerate, type GenerateOptions } from './generate.js';
export {
  runConfigSet,
  runConfigShow,
  runConfigModels,
  runConfigKey,
  runConfigDefault,
  runConfigInit,
  type ConfigSetOptions,
  type ConfigKeyOptions,
} from './config.js';
