import inquirer from 'inquirer';
import { loadConfig, updateConfig } from '../utils/config';
import { logger } from '../utils/logger';

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

        await logger.success(`\n🎯 Weekly goal set to ${weeklyTarget} problems!`);

        // Show current progress
        if (config.weeklyProgress.weekStart) {
            await logger.info('\n📊 Current Week Progress:');
            await logger.info(`📈 Progress: ${config.weeklyProgress.current}/${weeklyTarget} problems`);
            await logger.info(`📅 Week Started: ${config.weeklyProgress.weekStart}`);
        }

        // Show history if available
        if (config.weeklyProgress.history.length > 0) {
            await logger.info('\n📚 Previous Weeks:');
            config.weeklyProgress.history.slice(-5).reverse().forEach(async week => {
                const achievementRate = Math.round((week.achieved / week.target) * 100);
                await logger.info(`📅 Week of ${week.weekStart}: ${week.achieved}/${week.target} (${achievementRate}%)`);
            });
        }

        await logger.info('\n💡 Tip: Your progress will be tracked automatically when you submit solutions.');

    } catch (error) {
        await logger.error('❌ Error setting weekly goals:', error as Error);
        process.exit(1);
    }
}