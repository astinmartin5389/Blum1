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

    // Claim Farm Reward
    console.log('🌾 Claiming farm reward...'.yellow);
    const claimResponse = await claimFarmReward(token);
    if (claimResponse) {
      console.log('✅ Farm reward claimed successfully!'.green);
    }
    setupFarmRewardCron(token);

    // Start Farming Session
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
    setupCronJob(token);
    setupBalanceCheckJob(token);
    

    // Auto Complete Tasks
    console.log('✅ Auto completing tasks...'.yellow);
    const tasksData = await getTasks(token);
    tasksData.forEach((category) => {
      category.tasks.forEach(async (task) => {
        if (task.status === 'FINISHED') {
          console.log(`⏭️  Task "${task.title}" is already completed.`.cyan);
        } else if (task.status === 'NOT_STARTED') {
          console.log(
            `⏳ Task "${task.title}" is not started yet. Starting now...`.red
          );
          const startedTask = await startTask(token, task.id, task.title);
          if (startedTask) {
            console.log(
              `✅ Task "${startedTask.title}" has been started!`.green
            );
            console.log(`⏳ Claiming reward for "${task.title}" is starting now...`.red);
            try {
              const claimedTask = await claimTaskReward(token, task.id);
              console.log(
                `✅ Task "${claimedTask.title}" has been claimed!`.green
              );
              console.log(`🎁 Reward: ${claimedTask.reward}`.green);
            } catch (error) {
              console.log(
                `🚫 Unable to claim task "${task.title}", please try to claim it manually.`
                  .red
              );
            }
          }
        } else if (
            task.status === 'STARTED' ||
            task.status === 'READY_FOR_CLAIM'
          ) {
            try {
              const claimedTask = await claimTaskReward(token, task.id);
              console.log(
                `✅ Task "${claimedTask.title}" has been claimed!`.green
              );
              console.log(`🎁 Reward: ${claimedTask.reward}`.green);
            } catch (error) {
              console.log(`🚫 Unable to claim task "${task.title}".`.red);
            }
          }
        });
      });
  
      // Auto Play and Claim Game Points
      console.log('🎮 Auto playing game and claiming reward...'.yellow);
      if (balance.playPasses > 0) {
        let counter = balance.playPasses;
        while (counter > 0) {
          const gameData = await getGameId(token);
          console.log('⌛ Please wait for 1 minute to play the game...'.yellow);
          await delay(60000);
          const randPoints = Math.floor(Math.random() * (240 - 160 + 1)) + 160;
          const letsPlay = await claimGamePoints(token, gameData.gameId, randPoints);
          if (letsPlay === 'OK') {
            const balance = await getBalance(token);
            console.log(
              `🎮 Play game success! Your balance now: ${balance.availableBalance} BLUM`
                .green
            );
          }
          counter--;
        }
      } else {
        console.log(
          `🚫 You can't play again because you have ${balance.playPasses} chance(s) left.`
            .red
        );
      }
  
      // Claim Daily Reward
      console.log('✅ Claiming daily reward...'.yellow);
      const reward = await claimDailyReward(token);
      if (reward) {
        console.log('✅ Daily reward claimed successfully!'.green);
      }
      setupDailyRewardCron(token);
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
  
