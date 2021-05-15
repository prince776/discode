import { MysqlError } from 'mysql';
import { type } from 'os';
import sql from './db';

interface RoomData {
    id?: number;
    title?: string;
    body?: string;
}

type Callback = (error: { error?: MysqlError; message: string } | null, data?: RoomData) => void;

class Room {
    private data: RoomData;
    constructor(data: RoomData) {
        this.data = data;
    }

    static create = (data: RoomData, callback: Callback) => {
        sql.query('INSERT INTO rooms SET ? ', data, (error, res) => {
            if (error) {
                callback({ error, message: 'Mysql error' });
            } else {
                callback(null, { ...data, id: res.insertId });
            }
        });
    };

    static findById = (id: number, callback: Callback) => {
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
}

export = Room;
