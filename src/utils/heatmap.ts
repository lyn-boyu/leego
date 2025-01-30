import chalk from 'chalk';

interface PracticeLog {
  date: string;
  time_spent: string;
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function getDaysArray(startDate: Date, endDate: Date): Date[] {
  const arr: Date[] = [];
  const dt = new Date(startDate);
  while (dt <= endDate) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

function getIntensityColor(count: number): string {
  if (count === 0) return chalk.gray('⬚');
  if (count === 1) return chalk.green('▪');
  if (count <= 3) return chalk.green('▣');
  if (count <= 5) return chalk.green('▤');
  return chalk.green('▥');
}

export async function displayActivityHeatmap(logs: PracticeLog[]) {
  // Get date range (last 52 weeks)
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (52 * 7));

  // Create activity map
  const activityMap = new Map<string, number>();

  // Initialize all dates with 0
  getDaysArray(startDate, now).forEach(date => {
    activityMap.set(getDateKey(date), 0);
  });

  // Count activities
  logs.forEach(log => {
    const date = new Date(log.date);
    if (date >= startDate && date <= now) {
      const key = getDateKey(date);
      activityMap.set(key, (activityMap.get(key) || 0) + 1);
    }
  });

  // Display heatmap
  console.log(chalk.yellow('\nActivity Heatmap:'));

  // Display month labels
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let currentMonth = startDate.getMonth();
  process.stdout.write('     ');
  for (let i = 0; i < 53; i++) {
    const monthIndex = (currentMonth + i) % 12;
    if (i % 4 === 0) {
      process.stdout.write(months[monthIndex].padEnd(8));
    }
  }
  console.log();

  // Display the grid
  for (let day = 0; day < 7; day++) {
    process.stdout.write((['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] + ' ').padEnd(5));

    for (let week = 0; week < 53; week++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (week * 7) + day);
      if (date <= now) {
        const key = getDateKey(date);
        const count = activityMap.get(key) || 0;
        process.stdout.write(getIntensityColor(count) + ' ');
      }
    }
    console.log();
  }

  // Display legend
  console.log('\nLegend:');
  console.log(`${chalk.gray('⬚')} No activity  ${chalk.green('▪')} 1 submission  ${chalk.green('▣')} 2-3 submissions  ${chalk.green('▤')} 4-5 submissions  ${chalk.green('▥')} 5+ submissions`);
}