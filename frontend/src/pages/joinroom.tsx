import React from 'react';
import { useState } from 'react';
import { Link, RouteChildrenProps } from 'react-router-dom';

const JoinRoom: React.FC<RouteChildrenProps<any>> = (props) => {
    const [roomId, setRoomId] = useState<string>('');

    return (
        <div className="container-fluid">
            <div>
                <div className="form-group text-center pt-5 mt-5 row justify-content-center">
                    <div className="col-4">
                        <h1>Enter Room ID</h1>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="form-control"
                            placeholder="Enter room id"
                        />
                        <small id="emailHelp" className="form-text text-muted">
                            Ask from room host or <Link to="/newroom"> Make your own room </Link>
                        </small>
                    </div>
                </div>
                <div className="form-group text-center pt-3 row justify-content-center">
                    <button
                        onClick={() => {
                            if (roomId) props.history.push(`/room/${roomId}`);
                        }}
                        className="btn btn-primary col-2 text-lg"
                    >
                        <h3>Join Room</h3>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinRoom;
