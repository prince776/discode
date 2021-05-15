import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import API from '../utils/API';

const Room: React.FC<RouteComponentProps<any>> = (props) => {
    const [title, setTitle] = useState<string>('');
    const [body, setBody] = useState<string>('');

    useEffect(() => {
        const id = props.match.params.id;
        API.get(`/api/room/${id}`)
            .then((res) => {
                const { title, body } = res.data.data;
                setTitle(title);
                setBody(body);
            })
            .catch((err) => {
                props.history.push('/404');
            });
    }, [props]);

    return (
        <div className="container-fluid">
            <h1>{title}</h1>
            <p>{body}</p>
        </div>
    );
};

export default withRouter(Room);
