require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.DB_NAME || process.env.POSTGRES_DB,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: process.env.DB_USER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.DB_NAME || process.env.POSTGRES_DB,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.DB_NAME || process.env.POSTGRES_DB,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
};