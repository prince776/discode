import express from 'express';
import Room from './../models/room.model';
import { sendSuccess, sendError } from './../utils';
import { isUuid } from 'uuidv4';

const router = express.Router();

router.get('/:id', (req, res) => {
    const { id } = req.params;

    // Keeping number for legacy part
    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    Room.findById(id, (error, data) => {
        console.log(error);
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room fetched successfully', data);
        }
    });
});

router.patch('/:id', (req, res) => {
    const { title, body, input, language } = req.body;
    if (!title) return sendError(res, "Title can't be empty");
    const id = req.params.id;

    // Keeping number for legacy part
    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    Room.updateById({ title, body, id, input, language }, (error, data) => {
        console.log(error);
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room updated successfully', data);
        }
    });
});

router.post('/', (req, res) => {
    const { title, body, input, language } = req.body;
    if (!title) return sendError(res, "Title can't be empty");

    Room.create({ title, body, input, language }, (error, data) => {
        console.log(error);
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room created successfully', data);
        }
    });
});

export = router;
