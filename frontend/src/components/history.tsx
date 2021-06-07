import React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface HistoryProps {
    previousRooms: string[];
}

const History: React.FC<HistoryProps> = ({ previousRooms }) => {
    useEffect(() => {}, [previousRooms]);

    return (
        <div>
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                    </tr>
                </thead>
                <tbody>
                    {previousRooms.map((room, index) => {
                        const [roomId, roomTitle] = room.split('!', 2);
                        return (
                            <tr key={index}>
                                <td>
                                    <Link
                                        style={{
                                            display: 'block',
                                            textDecoration: 'none',
                                            color: 'black'
                                        }}
                                        to={`/room/${roomId}`}
                                    >
                                        {roomId}
                                    </Link>
                                </td>
                                <td>
                                    <Link
                                        style={{
                                            display: 'block',
                                            textDecoration: 'none',
                                            color: 'black'
                                        }}
                                        to={`/room/${roomId}`}
                                    >
                                        {roomTitle}
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default History;
