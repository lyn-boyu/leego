import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadConfig, updateConfig } from '../utils/config';


export async function setWeeklyGoals() {
    try {
        const config = await loadConfig();
        const currentTarget = config.weeklyProgress.target;

        const { weeklyTarget } = await inquirer.prompt([
            {
                type: 'number',
                name: 'weeklyTarget',
                message: 'How many problems would you like to solve per week?',
                default: currentTarget,
                validate: (input) => {
                    if (input < 1) return 'Please set a goal of at least 1 problem per week';
                    if (input > 50) return 'Please set a more realistic goal (maximum 50 per week)';
                    return true;
                }
            }
        ]);

        // Update config with new target
        config.weeklyProgress.target = weeklyTarget;
        await updateConfig(config);

        console.log(chalk.green(`\n✔ Weekly goal set to ${weeklyTarget} problems!`));

        // Show current progress
        if (config.weeklyProgress.weekStart) {
            console.log(chalk.blue('\nCurrent Week Progress:'));
            console.log(`Progress: ${config.weeklyProgress.current}/${weeklyTarget} problems`);
            console.log(`Week Started: ${config.weeklyProgress.weekStart}`);
        }

        // Show history if available
        if (config.weeklyProgress.history.length > 0) {
            console.log(chalk.blue('\nPrevious Weeks:'));
            config.weeklyProgress.history.slice(-5).reverse().forEach(week => {
                const achievementRate = Math.round((week.achieved / week.target) * 100);
                console.log(`Week of ${week.weekStart}: ${week.achieved}/${week.target} (${achievementRate}%)`);
            });
        }

        console.log(chalk.blue('\nTip: Your progress will be tracked automatically when you submit solutions.'));

    } catch (error) {
        console.error(chalk.red('Error setting weekly goals:', error.message));
        process.exit(1);
    }
}