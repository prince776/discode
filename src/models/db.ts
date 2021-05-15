import mysql from 'mysql';

const connection = mysql.createPool({
    connectionLimit: process.env.MAX_DB_CONN as unknown as number,
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT as unknown as number,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
});

export = connection;
