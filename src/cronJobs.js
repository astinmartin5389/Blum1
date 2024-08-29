const cron = require('cron');
const { getBalance, claimDailyReward, claimFarmReward } = require('./api');
let job, balanceCheckJob, dailyRewardJob, farmRewardJob;

function setupCronJob(token) {
  job = new cron.CronJob('0 * * * *', async () => {
    console.log('Starting farming session every 1min...'.yellow);
    await claimFarmReward(token);
    console.log('Farming reward claimed!'.green);
  });
  job.start();
  console.log('Cron job set up to run every 1 min.'.green);

  setTimeout(() => {
    job.stop();
  }, 900000); // stop the job after 15 minutes
}

function setupBalanceCheckJob(token) {
  balanceCheckJob = new cron.CronJob('* * * * *', async () => {
    const balance = await getBalance(token);
    console.log(
      `Updated farming balance: ${balance.farming.balance} BLUM`.green
    );
  });
  balanceCheckJob.start();
  console.log('Balance check job set up to run every minute.'.green);

  setTimeout(() => {
    balanceCheckJob.stop();
  }, 900000); // stop the job after 15 minutes
}

function setupFarmRewardCron(token) {
  farmRewardJob = new cron.CronJob('0 * * * *', async () => {
    console.log('Running farm reward cron job...'.yellow);
    const reward = await claimFarmReward(token);

    if (reward) {
      console.log('Farm reward claimed successfully!'.green);
    }
  });
  farmRewardJob.start();

  console.log('Daily reward cron job scheduled to run every 1min.'.green);

  setTimeout(() => {
    farmRewardJob.stop();
  }, 900000); // stop the job after 15 minutes
}

function setupDailyRewardCron(token) {
  dailyRewardJob = new cron.CronJob('0 0 * * *', async () => {
    console.log('Running daily reward cron job...'.yellow);
    const reward = await claimDailyReward(token);

    if (reward) {
      console.log('Daily reward claimed successfully!'.green);
    }
  });
  dailyRewardJob.start();

  console.log(
    'Daily reward cron job scheduled to run every 24 hours.'.green
  );

  setTimeout(() => {
    dailyRewardJob.stop();
  }, 900000); // stop the job after 15 minutes
}

module.exports = {
  setupCronJob,
  setupBalanceCheckJob,
  setupDailyRewardCron,
  setupFarmRewardCron,
};
