import { appendFile } from 'fs/promises';
import path from 'path';
import { formatDate } from './date';
import { PROJECT_PATHS } from '../config/constants';
import { ensureProjectDirectories, getTempFilePath } from './config';

class Logger {
    private logFile: string;

    constructor() {
        this.logFile = getTempFilePath('leetcode-', '.log');
    }

    private async writeLog(level: string, message: string) {
        await ensureProjectDirectories();
        const timestamp = formatDate(new Date());
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        await appendFile(this.logFile, logEntry);
    }

    async info(message: string) {
        await this.writeLog('INFO', message);
    }

    async error(message: string, error?: Error) {
        let errorMessage = message;
        if (error) {
            errorMessage += `\nError: ${error.message}`;
            if (error.stack) {
                errorMessage += `\nStack: ${error.stack}`;
            }
        }
        await this.writeLog('ERROR', errorMessage);
    }

    async debug(message: string) {
        await this.writeLog('DEBUG', message);
    }

    async warn(message: string) {
        await this.writeLog('WARN', message);
    }
}

export const logger = new Logger();