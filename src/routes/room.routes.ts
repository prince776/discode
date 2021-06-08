import express from 'express';
import Room from './../models/room.model';
import { sendSuccess, sendError } from './../utils';
import { isUuid } from 'uuidv4';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/:id', (req, res) => {
    let { id, password } = req.params;
    if (!password) password = '';

    // Keeping number for legacy part
    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    Room.findById(id, (error, data) => {
        console.log(error);
        if (error) {
            sendError(res, error.message);
        } else {
            if (data?.password && !bcrypt.compareSync(password, data.password)) {
                return sendError(res, 'Wrong password');
            }
            sendSuccess(res, 'Room fetched successfully', data);
        }
    });
});

router.patch('/:id', (req, res) => {
    const id = req.params.id;
    const { title, body, input, language } = req.body;
    let { password } = req.body;

    if (!title) return sendError(res, "Title can't be empty");
    if (!password) password = '';

    // Keeping number for legacy part
    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    Room.findById(id, (error, data) => {
        console.log(error);
        if (error) {
            sendError(res, error.message);
        } else {
            if (data?.password && !bcrypt.compareSync(password, data.password)) {
                return sendError(res, 'Wrong password');
            }
            Room.updateById({ title, body, id, input, language }, (error, data) => {
                console.log(error);
                if (error) {
                    sendError(res, error.message);
                } else {
                    sendSuccess(res, 'Room updated successfully', data);
                }
            });
        }
    });
});

router.post('/', (req, res) => {
    const { title, body, input, language } = req.body;
    let { password } = req.body;

    if (!title) return sendError(res, "Title can't be empty");
    if (!password) password = '';
    password = bcrypt.hashSync(password, 10);

    Room.create({ title, body, input, language, password }, (error, data) => {
        console.log(error);
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room created successfully', data);
        }
    });
});

export = router;
