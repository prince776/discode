if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

import express from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 8080;
const app = express();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    cors({
        allowedHeaders: ['Content-Type'],
        credentials: true,
        origin: ['http://localhost:3000']
    })
);

// Routes
app.use('/api/room', require('./routes/room.routes'));

app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});
