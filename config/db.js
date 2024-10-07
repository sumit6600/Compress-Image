// db/mysql.js
const mysql = require('mysql2');
require('dotenv').config();

let connection_config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}
const pool = mysql.createPool(connection_config);

const promisePool = pool.promise();

pool.on('acquire', (connection) => {
    console.log('✅ Connected to MySQL database successfully (Connection ID: ' + connection.threadId + ').');
});

const testConnection = () => {
    try {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('❌ Unable to connect to MySQL database:', err);
            } else {
                console.log('✅ MySQL connection test passed.');
                connection.release();  // Release the connection back to the pool
            }
        });
    } catch (error) {
        console.error('❌ Unexpected error during MySQL connection test:', error);
    }
};

testConnection();
module.exports = promisePool;
