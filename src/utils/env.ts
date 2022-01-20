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
  getEnv,
};

export default environment;
