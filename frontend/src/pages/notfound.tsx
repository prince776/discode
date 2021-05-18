import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    return (
        <div className="p-5 text-center">
            <h1 className="mb-3">404 Page not found</h1>
            <Link to="/">Return to home</Link>
        </div>
    );
};

export default NotFound;
