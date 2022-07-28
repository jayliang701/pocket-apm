import MainProcess from './lib/MainProcess';
import path from 'path';


const config = process.env.CONFIG || path.resolve(__dirname, './config.js');
const main = new MainProcess(config);
main.start();
