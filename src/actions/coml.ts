import sql from 'mssql';

const config: sql.config = {
  user: 'sa',
  password: 'Abdullah123@',
  server: 'REDMI8',
  database: 'global',
  options: {
    encrypt: false, // إذا لم تستخدم SSL
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ MSSQL متصل');
    return pool;
  })
  .catch(err => {
    console.error('❌ خطأ في الاتصال بـ MSSQL', err);
    throw err;
  });

export default {
  query: async (query: string, params: Record<string, any>) => {
    const pool = await poolPromise;
    const request = pool.request();

    // تمرير القيم كـ input
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    return request.query(query);
  },
};
