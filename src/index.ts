import MainProcess from './lib/MainProcess';
import path from 'path';
import { initTimeUtil } from './lib/utils';

initTimeUtil();

const config = process.env.CONFIG || path.resolve(__dirname, './config.js');
const main = new MainProcess(config);
main.start();
