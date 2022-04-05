import dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV;

export function getConfigPath(env: string | undefined) {
  return `../../.env${env === 'test' ? '.test' : ''}`;
}

dotenv.config({
  path: path.resolve(__dirname, getConfigPath(nodeEnv)),
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

  // Other..
  getEnv: (name: string, def: string) => string;
} = {
  env: process.env,

  // Current env
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTesting: nodeEnv === 'test',

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
  IB_PORT: getEnv('IB_PORT', '4002'),
  IB_CLIENT_ID_BROKER: getEnv('IB_CLIENT_ID_BROKER', '1'),
  IB_CLIENT_ID_DATA_PROVIDER: getEnv('IB_CLIENT_ID_DATA_PROVIDER', '2'),

  getEnv,
};

export default environment;
