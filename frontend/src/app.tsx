import React, { useEffect } from 'react';
import { useState } from 'react';
import { BrowserRouter, Route, Switch, RouteComponentProps } from 'react-router-dom';
import Header from './components/header';
import Home from './pages/home';
import routes, { roomProps } from './routes';

const App: React.FC = () => {
    const [previousRooms, setPreviousRooms] = useState<string[]>([]);

    roomProps.updatePreviousRooms = (room) => {
        if (previousRooms[0] === room) return;
        let newRooms = [...previousRooms];
        newRooms.unshift(room);
        newRooms.slice(0, 40);
        setPreviousRooms(newRooms);
    };

    useEffect(() => {
        const prevRoomsString = localStorage.getItem('previousRooms');
        if (prevRoomsString) {
            setPreviousRooms(JSON.parse(prevRoomsString).previousRooms);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('previousRooms', JSON.stringify({ previousRooms }));
    }, [previousRooms]);

    return (
        <div style={{ height: '100vh' }} className="bg-light">
            <BrowserRouter>
                <Header />
                <br />
                <Switch>
                    {/* Adding this manually because this structure of routes sucks */}
                    <Route exact path="/" render={() => <Home previousRooms={previousRooms} />} />
                    {routes.map((route, index) => {
                        return (
                            <Route
                                key={index}
                                path={route.path}
                                exact={route.exact}
                                render={(props: RouteComponentProps<any>) => (
                                    <route.component
                                        {...props}
                                        {...(route.props ? route.props.props : {})}
                                    />
                                )}
                            />
                        );
                    })}
                </Switch>
            </BrowserRouter>
        </div>
    );
};

export default App;
