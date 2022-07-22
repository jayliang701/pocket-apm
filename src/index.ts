import App from './lib/App';
import path from 'path';


const config = process.env.CONFIG || path.resolve(__dirname, './config.js');
const app = new App(config);
app.start();
