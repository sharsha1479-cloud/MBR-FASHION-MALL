const path = require('path');
const dotenv = require('dotenv');

const backendEnvPath = path.resolve(__dirname, '..', '.env');
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

const loadEnv = () => {
  dotenv.config({ path: backendEnvPath });

  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: rootEnvPath });
  }
};

module.exports = loadEnv;
