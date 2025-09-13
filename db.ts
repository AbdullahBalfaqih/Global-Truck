import sql from 'mssql';

const config: sql.config = { // <-- Explicitly tell TypeScript the type of the config object
    server: 'localhost', // أو REDMI8
    database: 'global',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    authentication: {
        type: 'ntlm',
        options: {
            userName: '', // يمكن أن يكون فارغًا
            password: '',
            domain: ''
        }
    }
};

sql.connect(config)
    .then((pool: sql.ConnectionPool) => {
        console.log('✅ Connected to SQL Server');
        return pool.close();
    })
    .catch((err: any) => {
        console.error('❌ Connection Failed:', err);
    });