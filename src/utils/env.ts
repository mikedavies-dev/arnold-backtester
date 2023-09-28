import dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV;

export function getConfigPath(env: string | undefined) {
  switch (env) {
    case 'test':
    case 'test_ci':
      return `../../.env.${env}`;

    default:
      return null;
  }
}

// load the main config
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: true,
});

// load the env based config (if any)
const envConfig = getConfigPath(nodeEnv);

if (envConfig) {
  dotenv.config({
    path: path.resolve(__dirname, envConfig),
    override: true,
  });
}

function getEnv(name: string, def: string) {
  return process.env[name] || def;
}

const environment: {
  env: any;
  isDevelopment: boolean;
  isProduction: boolean;
  isTesting: boolean;
  MONGO_CONNECTION_STRING: string;
  SERVER_PORT: string;

  // Data provider
  DATA_PROVIDER_BACKTEST: string;
  DATA_PROVIDER_TRADER: string;

  BROKER_PROVIDER: string;

  // IB
  IB_HOST: string;
  IB_PORT: string;
  IB_BASE_CLIENT_ID: string;
  IB_LOCK_TIMEOUT: string;
  IB_DISPLAY_GROUP: string;

  DISABLE_PROVIDER_TESTS: string;
  NODE_ENV: string;
  USER_FOLDER: string;

  POLYGONIO_KEY: string;
  RUN_INLINE: string;

  // Other..
  getEnv: (name: string, def: string) => string;
  getUserPath: (path: string) => string;
} = {
  env: process.env,
  // Current env
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTesting: ['test', 'test_ci'].indexOf(nodeEnv as string) !== -1,
  // Load specific variables with defaults
  MONGO_CONNECTION_STRING: getEnv(
    'MONGO_CONNECTION_STRING',
    'mongodb://localhost:27017/arnold',
  ),
  SERVER_PORT: getEnv('SERVER_PORT', '4010'),

  // Data
  DATA_PROVIDER_BACKTEST: getEnv('DATA_PROVIDER_BACKTEST', 'ib'),
  DATA_PROVIDER_TRADER: getEnv('DATA_PROVIDER_TRADER', 'ib'),
  BROKER_PROVIDER: getEnv('BROKER_PROVIDER', 'ib'),

  // IB
  IB_HOST: getEnv('IB_HOST', '127.0.0.1'),
  IB_PORT: getEnv('IB_PORT', '4003'),
  IB_BASE_CLIENT_ID: getEnv('IB_BASE_CLIENT_ID', '1'),
  IB_LOCK_TIMEOUT: getEnv('IB_LOCK_TIMEOUT', '120000'),
  IB_DISPLAY_GROUP: getEnv('IB_DISPLAY_GROUP', '7'),

  POLYGONIO_KEY: getEnv('POLYGONIO_KEY', ''),

  DISABLE_PROVIDER_TESTS: getEnv('DISABLE_PROVIDER_TESTS', ''),
  RUN_INLINE: getEnv('RUN_INLINE', ''),

  USER_FOLDER: getEnv('USER_FOLDER', './user'),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  getEnv,
  getUserPath: (filename: string) =>
    path.join(process.cwd(), environment.USER_FOLDER, filename),
};

export default environment;
