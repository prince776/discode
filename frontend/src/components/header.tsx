import React from 'react';
import { useState } from 'react';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';

const Header: React.FC<RouteComponentProps<any>> = (props) => {
    const [roomId, setRoomId] = useState<string>();

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/">
                    Discode
                </Link>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <Link className="nav-link active" aria-current="page" to="/">
                                Home
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" aria-current="page" to="/newroom">
                                New Room
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" aria-current="page" to="/joinroom">
                                Join Room
                            </Link>
                        </li>
                    </ul>
                    <div className="d-flex">
                        <input
                            className="form-control me-2"
                            type="search"
                            placeholder="Enter Room ID"
                            aria-label="Search"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <button
                            className="btn btn-outline-success"
                            onClick={() => {
                                if (roomId) {
                                    props.history.push(`/room/${roomId}`);
                                    setRoomId('');
                                }
                            }}
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default withRouter(Header);
