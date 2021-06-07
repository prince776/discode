import { MysqlError } from 'mysql';
import { type } from 'os';
import sql from './db';
import { uuid } from 'uuidv4';

interface RoomData {
    id?: string;
    title?: string;
    body?: string;
    input?: string;
    language?: string;
}

type Callback = (error: { error?: MysqlError; message: string } | null, data?: RoomData) => void;

class Room {
    private data: RoomData;
    constructor(data: RoomData) {
        this.data = data;
    }

    static create = (data: RoomData, callback: Callback) => {
        data.id = uuid();
        sql.query('INSERT INTO rooms SET ? ', data, (error, res) => {
            if (error) {
                callback({ error, message: 'Mysql error' });
            } else {
                callback(null, { ...data });
            }
        });
    };

    static findById = (id: string, callback: Callback) => {
        sql.query('SELECT * FROM rooms where id = ?', [id], (error, res) => {
            if (error) {
                callback({ error, message: 'Mysql error' });
            } else if (!res.length) {
                callback({ message: 'No room found' });
            } else {
                callback(null, res[0]);
            }
        });
    };

    static updateById = (data: RoomData, callback: Callback) => {
        sql.query('UPDATE rooms SET ? WHERE id = ?', [data, data.id], (error, res) => {
            if (error) {
                callback({ error, message: 'Mysql error' });
            } else if (!res.affectedRows) {
                callback({ message: 'No room found' });
            } else {
                callback(null, data);
            }
        });
    };
}

export = Room;
