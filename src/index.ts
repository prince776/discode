if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

import express from 'express';

const PORT = process.env.PORT || 8080;
const app = express();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use('/api/room', require('./routes/room.routes'));

app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});
