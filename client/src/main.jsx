import { createRoot } from 'react-dom/client';
import Home from './Home.jsx';
import Room from './Room.jsx';
import './styles.css';
import './ms.css';

const m = location.pathname.match(/^\/r\/([A-Za-z0-9]{6})/);
createRoot(document.getElementById('root')).render(m ? <Room code={m[1].toUpperCase()} /> : <Home />);
