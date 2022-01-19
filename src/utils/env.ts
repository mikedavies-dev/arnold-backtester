import dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV;

const configPath = `../../config/${nodeEnv === 'test' ? 'test' : ''}.env`;

dotenv.config({
  path: path.resolve(__dirname, configPath),
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
};

export default environment;
