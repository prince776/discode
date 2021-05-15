import express from 'express';
import Room from './../models/room.model';
import { sendSuccess, sendError} from './../utils';

const router = express.Router();

router.get('/:id', (req, res) => {
    Room.findById(+req.params.id, (error, data) => {
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room fetched successfully', data);
        }
    });
});

router.post('/', (req, res) => {
    const { title, body } = req.body;
    if (!title) return sendError(res, "Title can't be empty");

    Room.create({ title, body }, (error, data) => {
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room created successfully', data);
        }
    })
});

export = router;
