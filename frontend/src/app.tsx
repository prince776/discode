import React from 'react';
import { BrowserRouter, Route, Switch, RouteComponentProps } from 'react-router-dom';
import Header from './components/header';
import routes from './routes';

const App: React.FC = () => {
    return (
        <div>
            <BrowserRouter>
                <Header />
                <br />
                <Switch>
                    {routes.map((route, index) => {
                        return (
                            <Route
                                key={index}
                                path={route.path}
                                exact={route.exact}
                                render={(props: RouteComponentProps<any>) => (
                                    <route.component {...props} {...route.props} />
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
