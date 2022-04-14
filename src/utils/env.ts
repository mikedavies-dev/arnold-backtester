import dotenv from 'dotenv';
import {boolean} from 'fp-ts';
import path from 'path';

const nodeEnv = process.env.NODE_ENV;

export function getConfigPath(env: string | undefined) {
  switch (env) {
    case 'test':
    case 'test_ci':
      return `../../.env.${env}`;

    default:
      return '../../.env';
  }
}

dotenv.config({
  path: path.resolve(__dirname, getConfigPath(nodeEnv)),
  override: true,
});

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
  DATA_PROVIDER: string;

  // IB
  IB_HOST: string;
  IB_PORT: string;
  IB_CLIENT_ID_BROKER: string;
  IB_CLIENT_ID_DATA_PROVIDER: string;

  EARLIEST_DATA: string;

  DISABLE_PROVIDER_TESTS: string;

  // Other..
  getEnv: (name: string, def: string) => string;
} = {
  env: process.env,

  // Current env
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTesting: nodeEnv === 'test' || nodeEnv === 'test_ci',

  // Load specific variables with defaults
  MONGO_CONNECTION_STRING: getEnv(
    'MONGO_CONNECTION_STRING',
    'mongodb://localhost:27017/arnold',
  ),
  SERVER_PORT: getEnv('SERVER_PORT', '4010'),

  // Data
  DATA_PROVIDER: getEnv('DATA_PROVIDER', 'ib'),

  // IB
  IB_HOST: getEnv('IB_HOST', '127.0.0.1'),
  IB_PORT: getEnv('IB_PORT', '4003'),
  IB_CLIENT_ID_BROKER: getEnv('IB_CLIENT_ID_BROKER', '1'),
  IB_CLIENT_ID_DATA_PROVIDER: getEnv('IB_CLIENT_ID_DATA_PROVIDER', '2'),

  EARLIEST_DATA: getEnv('EARLIEST_DATA', '2021-01-01'),

  DISABLE_PROVIDER_TESTS: getEnv('DISABLE_PROVIDER_TESTS', '1'),

  getEnv,
};

export default environment;
