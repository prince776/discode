import Room from './pages/room';
import Home from './pages/home';
import NotFound from './pages/notfound';
import JoinRoom from './pages/joinroom';
import NewRoom from './pages/newroom';

interface IRoute {
    path: string;
    exact: boolean;
    component: any;
    props?: any;
}

const routes: Array<IRoute> = [
    {
        path: '/',
        exact: true,
        component: Home
    },
    {
        path: '/room/:id',
        exact: true,
        component: Room
    },
    {
        path: '/404',
        exact: true,
        component: NotFound
    },
    {
        path: '/joinroom',
        exact: true,
        component: JoinRoom
    },
    {
        path: '/newroom',
        exact: true,
        component: NewRoom
    },

    // Should stay at end
    {
        path: '/',
        exact: false,
        component: NotFound
    }
];

export default routes;
