require('dotenv').config();
require('colors');
const readlineSync = require('readline-sync');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const {
  getToken,
  getUsername,
  getBalance,
  getTribe,
  claimFarmReward,
  startFarmingSession,
  getTasks,
  claimTaskReward,
  getGameId,
  claimGamePoints,
  startTask,
  claimDailyReward,
} = require('./src/api.js');
const {
  setupCronJob,
  setupBalanceCheckJob,
  setupDailyRewardCron,
  setupFarmRewardCron,
} = require('./src/cronJobs');
const { delay } = require('./src/utils');
const { displayHeader } = require('./src/display');

const TOKEN_FILE_PATH = path.join(__dirname, 'accessToken.txt');

(async () => {
  displayHeader();
  console.log('⌛ Please wait...\n'.yellow);

  let token;

  if (fs.existsSync(TOKEN_FILE_PATH)) {
    token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  } else {
    token = await getToken();
    fs.writeFileSync(TOKEN_FILE_PATH, token);
    console.log('✅ New token has been saved.');
  }

  try {
    const username = await getUsername(token);
    const balance = await getBalance(token);
    const tribe = await getTribe(token);

    console.log(`👋 Hello, ${username}!`.green);
    console.log(
      `💰 Your current BLUM balance is: ${balance.availableBalance}`.green
    );
    console.log(`🎮 Your chances to play the game: ${balance.playPasses}`);
    console.log('');
    console.log('🏰 Your tribe details:');
    if (tribe) {
      console.log(`   - Name: ${tribe.title}`);
      console.log(`   - Members: ${tribe.countMembers}`);
      console.log(`   - Earn Balance: ${tribe.earnBalance}`);
      console.log(`   - Your Role: ${tribe.role}`);
      console.log('');
    } else {
      console.error('🚨 Tribe not found!'.red);
      console.log(
        `Join HCA Tribe here: https://t.me/HappyCuanAirdrop/19694\n`.blue
      );
    }

    // Auto farm and claim
    console.log('🌾 Claiming farm reward...'.yellow);
    const claimResponse = await claimFarmReward(token);

    if (claimResponse) {
      console.log('✅ Farm reward claimed successfully!'.green);
    }

    // Start farming session
    console.log('🚜 Starting farming session...'.yellow);
    const farmingSession = await startFarmingSession(token);
    const farmStartTime = moment(farmingSession.startTime).format(
      'MMMM Do YYYY, h:mm:ss A'
    );
    const farmEndTime = moment(farmingSession.endTime).format(
      'MMMM Do YYYY, h:mm:ss A'
    );

    console.log(`✅ Farming session started!`.green);
    console.log(`⏰ Start time: ${farmStartTime}`);
    console.log(`⏳ End time: ${farmEndTime}`);

    // Set up cron jobs
    setupCronJob(token);
    setupBalanceCheckJob(token);
    setupFarmRewardCron(token);
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.message === `It's too early to claim`
    ) {
      console.error(`🚨 Claim failed! It's too early to claim.`.red);
    } else if (
      error.response &&
      error.response.data &&
      error.response.data.message === 'Need to start farm'
    ) {
      console.error(`🚨 Claim failed! You need to start farm first.`.red);
    } else if (
      error.response &&
      error.response.data &&
      error.response.data.message === 'Need to claim farm'
    ) {
      console.error(`🚨 Claim failed! You need to claim farm first.`.red);
    } else if (error.response && error.response.data === 'Unauthorized') {
      console.error(
        '🚨 Error occurred: Your token is expired, please get your latest Query ID again.'
          .red
      );
    } else {
      console.error('🚨 Error occurred:'.red, error.message);
    }
  }
})();
