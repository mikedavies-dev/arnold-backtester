const nodeEnv = process.env.NODE_ENV;

function getEnv(name: string, def: string) {
  return process.env[name] || def;
}

const environment: {
  env: any;
  isDevelopment: boolean;
  isProduction: boolean;
  isTesting: boolean;
  MYSQL_HOST: string;
  MYSQL_PORT: string;
  MYSQL_USER: string;
  MYSQL_PASS: string;
  MYSQL_DB: string;
} = {
  env: process.env,

  // Current env
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTesting: nodeEnv === 'test',

  // Load specific variables with defaults
  MYSQL_HOST: getEnv('MYSQL_HOST', 'localhost'),
  MYSQL_PORT: getEnv('MYSQL_PORT', '3306'),
  MYSQL_USER: getEnv('MYSQL_USER', 'root'),
  MYSQL_PASS: getEnv('MYSQL_PASS', 'root'),
  MYSQL_DB: getEnv('MYSQL_DB', 'arnold'),
};

export default environment;
