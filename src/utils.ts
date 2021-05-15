import { Response } from 'express';

const sendData = (res: Response, message: string, data: any, success: boolean, status: number) => {
    res.status(status).send({
        success,
        message,
        data
    });
};

export function sendSuccess(res: Response, message: string, data: any, status: number = 200) {
    sendData(res, message, data, true, status);
}

export function sendError(res: Response, message: string, data: any = {}, status: number = 400) {
    sendData(res, message, data, false, status);
}
