const sql = require('mssql');
const { ManagedIdentityCredential } = require('@azure/identity');
const { execSync } = require('child_process');
require('dotenv').config();

const AZ = '"C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd"';

async function getToken() {
  if (process.env.NODE_ENV === 'production') {
    const credential = new ManagedIdentityCredential();
    const token = await credential.getToken('https://database.windows.net/.default');
    return token.token;
  }
  const out = execSync(
    `${AZ} account get-access-token --resource https://database.windows.net/ --output json`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(out).accessToken;
}

async function createPool(database) {
  const token = await getToken();
  const pool = new sql.ConnectionPool({
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT) || 1433,
    database,
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token },
    },
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  });
  await pool.connect();
  return pool;
}

const blogPool      = createPool(process.env.DB_BLOG);
const moviesPool    = createPool(process.env.DB_MOVIES);
const gradebookPool = createPool(process.env.DB_GRADEBOOK);

blogPool.then(() => console.log('✓ Blog DB connected'))
        .catch(err => console.error('✗ Blog DB failed:', err.message));
moviesPool.then(() => console.log('✓ Movies DB connected'))
          .catch(err => console.error('✗ Movies DB failed:', err.message));
gradebookPool.then(() => console.log('✓ Gradebook DB connected'))
             .catch(err => console.error('✗ Gradebook DB failed:', err.message));

module.exports = { sql, blogPool, moviesPool, gradebookPool };
