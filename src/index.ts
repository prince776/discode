if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

import express from 'express';
import cors from 'cors';
import http from 'http';

const PORT = process.env.PORT || 8080;
const app = express();
app.set('port', PORT);

const server = http.createServer(app);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    cors({
        allowedHeaders: ['Content-Type'],
        origin: ['http://localhost:3000']
    })
);

// Routes
app.use('/api/room', require('./routes/room.routes'));

// Socket.io
import { Server, Socket } from 'socket.io';
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000'
    }
});

io.on('connection', (socket) => {
    socket.on('updateBody', (value) => {
        io.emit('updateBody', value);
    });
    socket.on('updateInput', (value) => {
        io.emit('updateInput', value);
    });
    socket.on('updateLanguage', (value) => {
        io.emit('updateLanguage', value);
    });
    socket.on('updateOutput', (value) => {
        io.emit('updateOutput', value);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});
