const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Abdullah123@',
    server: 'REDMI8',
    database: 'global',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

sql.connect(config)
    .then(() => console.log('✅ Connection Successful!'))
    .catch(err => console.error('❌ Connection Failed:', err));
