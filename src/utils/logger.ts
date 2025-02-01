import { appendFile, readdir, unlink } from 'fs/promises';
import path from 'path';
import { Chalk } from 'chalk';
import { formatDate, parseDate } from './date';
import { PROJECT_PATHS } from '../config/constants';
import { ensureProjectDirectories, getTempFilePath } from './config';

// Force chalk to use colors
const chalk = new Chalk({ level: 2 });

// Log levels with their configurations
const LOG_LEVELS = {
    DEBUG: {
        level: 0,
        color: chalk.gray,
        terminal: false,
        file: true
    },
    INFO: {
        level: 1,
        color: chalk.blue,
        terminal: true,
        file: true
    },
    WARN: {
        level: 2,
        color: chalk.yellow,
        terminal: true,
        file: true
    },
    ERROR: {
        level: 3,
        color: chalk.red,
        terminal: true,
        file: true
    },
    SUCCESS: {
        level: 4,
        color: chalk.green,
        terminal: true,
        file: true
    }
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface LoggerOptions {
    debug?: boolean;
    logRetentionDays?: number;
    silent?: boolean;
}

class Logger {
    private logFile: string;
    private _debug: boolean;
    private logRetentionDays: number;
    private silent: boolean;

    constructor(options: LoggerOptions = {}) {
        this.logFile = getTempFilePath('leetcode-', '.log');
        this._debug = options.debug ?? false;
        this.logRetentionDays = options.logRetentionDays ?? 7;
        this.silent = options.silent ?? false;

        // Clean old logs when creating a new logger instance
        this.cleanOldLogs().catch(console.error);
    }

    /**
     * Get debug mode status
     */
    get debug(): boolean {
        return this._debug;
    }

    /**
     * Set debug mode
     */
    setDebug(enabled: boolean): void {
        this._debug = enabled;
    }

    /**
     * Set log retention period
     */
    setLogRetention(days: number): void {
        this.logRetentionDays = days;
    }

    /**
     * Set silent mode (no terminal output)
     */
    setSilent(silent: boolean): void {
        this.silent = silent;
    }

    /**
     * Clean old log files
     */
    private async cleanOldLogs(): Promise<void> {
        try {
            const logsDir = path.join(process.cwd(), PROJECT_PATHS.logs);
            const files = await readdir(logsDir);
            const now = new Date();

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = path.join(logsDir, file);
                const fileDate = this.extractDateFromFileName(file);

                if (fileDate) {
                    const diffDays = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays > this.logRetentionDays) {
                        await unlink(filePath);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    /**
     * Extract date from log file name
     */
    private extractDateFromFileName(fileName: string): Date | null {
        const match = fileName.match(/leetcode-(\d{2}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
        if (match) {
            return parseDate(match[1]);
        }
        return null;
    }

    /**
     * Format log message with timestamp and level
     */
    private formatLogMessage(level: LogLevel, message: string): string {
        const timestamp = formatDate(new Date());
        return `[${timestamp}] [${level}] ${message}`;
    }

    /**
     * Colorize message based on content
     */
    private colorizeMessage(message: string, level: LogLevel): string {
        // Special emoji/status indicators should keep their intended color
        if (message.includes('🤖')) {
            return chalk.blue(message);
        }
        if (message.includes('✓') || message.includes('✅') || message.includes('passed')) {
            return chalk.green(message);
        }
        if (message.includes('❌') || message.includes('failed')) {
            return chalk.red(message);
        }

        // Use level-specific color for the message
        return LOG_LEVELS[level].color(message);
    }

    /**
     * Write log entry
     */
    private async log(level: LogLevel, message: string): Promise<void> {
        const config = LOG_LEVELS[level];
        const formattedMessage = this.formatLogMessage(level, message);

        // Write to file if enabled for this level
        if (config.file) {
            await ensureProjectDirectories();
            await appendFile(this.logFile, formattedMessage + '\n');
        }

        // Write to terminal if enabled and not in silent mode
        if (!this.silent && (config.terminal || this._debug)) {
            // Split the message into parts
            const timestamp = formatDate(new Date());

            // Write timestamp in gray
            process.stdout.write(chalk.gray(`[${timestamp}] `));

            // Write level in its color
            process.stdout.write(config.color(`[${level}] `));

            // Write message with appropriate color
            process.stdout.write(this.colorizeMessage(message, level) + '\n');
        }
    }

    /**
     * Debug level logging
     */
    async debug(message: string): Promise<void> {
        if (this._debug) {
            await this.log('DEBUG', message);
        }
    }

    /**
     * Info level logging
     */
    async info(message: string): Promise<void> {
        await this.log('INFO', message);
    }

    /**
     * Warning level logging
     */
    async warn(message: string): Promise<void> {
        await this.log('WARN', message);
    }

    /**
     * Error level logging
     */
    async error(message: string, error?: Error): Promise<void> {
        let errorMessage = message;
        if (error) {
            errorMessage += `\nError: ${error.message}`;
            if (error.stack) {
                errorMessage += `\nStack: ${error.stack}`;
            }
        }
        await this.log('ERROR', errorMessage);
    }

    /**
     * Success level logging
     */
    async success(message: string): Promise<void> {
        await this.log('SUCCESS', message);
    }
}

// Create default logger instance
export const logger = new Logger();

// Export Logger class for custom instances
export { Logger, type LoggerOptions };