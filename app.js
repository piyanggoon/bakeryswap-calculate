const Web3 = require('web3');
const request = require('request');
const utils = require('./utility.js');
const abi = require('./abi.js');

const myAddress = '0x9d201Bb5da57460496F0D94afd60a5A13A3231D9'; // edit
const BNBInvestment = 34.909862751111051142; // edit (now only calculate in BNB/BAKE)

//
const provider = 'https://bsc-dataseed1.binance.org/';
const web3 = new Web3(new Web3.providers.HttpProvider(provider));

const contractAddress = '0x20eC291bB8459b6145317E7126532CE7EcE5056f';
const contract = new web3.eth.Contract(abi, contractAddress);

const BNB_BAKE = '0xc2Eed0F5a0dc28cfa895084bC0a9B8B8279aE492';
const BAKE_BAKE = '0xe02df9e3e622debdd69fb838bb799e3f168902c5';

//
const BAKEContract = '0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5';
const BAKEAddress = '0xc2eed0f5a0dc28cfa895084bc0a9b8b8279ae492';

const BNBContract = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BNBAddress = '0xc2eed0f5a0dc28cfa895084bc0a9b8b8279ae492';

const BLPContract = '0xc2eed0f5a0dc28cfa895084bc0a9b8b8279ae492';

async function getPoolInfo(pair, address) {
  let poolInfoMap = contract.methods.poolInfoMap(pair);
  let poolUserInfoMap = contract.methods.poolUserInfoMap(pair, address);
  
  return new Promise((resolve, reject) => {
    poolInfoMap.call((err, res) => {
      if(err) return reject(new Error('getPoolInfo'));
      
      let accBakePerShare = res[2];
      let accBakePerShareMultiple = 1E12;
      poolUserInfoMap.call((err, res) => {
        if(err) return reject(new Error('getPoolInfo'));
        
        let amount = res[0];
        let rewardDebt = res[1];
        let pendingReward = (amount * accBakePerShare) / accBakePerShareMultiple - rewardDebt;
        
        resolve({
          liquidity: utils.token(amount),
          pendingReward: utils.token(pendingReward)
        });
      });
    });
  });
}

async function getBalance(contract, address) {
  let url = 'https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress='+contract +'&address='+address+'&tag=latest';
  
  return new Promise((resolve, reject) => {
    request.get(url, (err, res, body) => {
      if(err || res.statusCode != 200) return reject(new Error('getBalance'));
      
      let json = JSON.parse(body);
      let balance = json.result;
          balance = utils.token(balance);
      
      resolve(balance);
    });
  });
}

async function getSupply(contract) {
  let url = 'https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress='+contract;
  
  return new Promise((resolve, reject) => {
    request.get(url, (err, res, body) => {
      if(err || res.statusCode != 200) return reject(new Error('getSupply'));
      
      let json = JSON.parse(body);
      let supply = json.result;
          supply = utils.token(supply);
      
      resolve(supply);
    });
  });
}

async function getBNBPrice() {
  let url = 'https://api.binance.com/api/v1/depth?symbol=BNBUSDT&limit=5';
  
  return new Promise((resolve, reject) => {
    request.get(url, (err, res, body) => {
      if(err || res.statusCode != 200) return reject(new Error('getBNBPrice'));
      
      let json = JSON.parse(body);
      let bid = parseFloat(json.bids[0][0]);
      let ask = parseFloat(json.asks[0][0]);
      
      resolve((bid + ask) / 2);
    });
  });
}

async function startHere() {
  let bnbBalance = await getBalance(BNBContract, BNBAddress);
  let bakeBalance = await getBalance(BAKEContract, BAKEAddress);
  let blpSupply = await getSupply(BLPContract);
  
  let BNBPool = await getPoolInfo(BNB_BAKE, myAddress);
  let BAKEPool = await getPoolInfo(BAKE_BAKE, myAddress);
  
  let bnb_bake = bakeBalance / bnbBalance;
      bnb_bake = bnb_bake - (bnb_bake * 0.003);
  let bnb_usd = await getBNBPrice();
  let bake_usd = bnb_usd / (bakeBalance / bnbBalance);
  let bnbValue = bnbBalance * bnb_usd;
  let bakeValue = bakeBalance * bake_usd;
  
  // BNB/BAKE
  let myBLP = BNBPool.liquidity;
  let poolShare = myBLP / blpSupply * 100;
  let myBNB = bnbBalance * poolShare / 100;
  let myBNBValue = myBNB * bnb_usd;
  let myBAKE = bakeBalance * poolShare / 100;
  let myBAKEValue = myBAKE * bake_usd;
  let myBAKEMining = BNBPool.pendingReward;
  let myBAKEMiningValue = myBAKEMining * bake_usd;
  let poolValue = myBNBValue + myBAKEValue + myBAKEMiningValue;
  
  // BAKE/BAKE
  let myBAKEStake = BAKEPool.liquidity;
  let myBAKEStakeValue = myBAKEStake * bake_usd;
  let myBAKEStakeMining = BAKEPool.pendingReward;
  let myBAKEStakeMiningValue = myBAKEStakeMining * bake_usd;
  let BAKEPoolValue = myBAKEStakeValue + myBAKEStakeMiningValue;
  
  let myBAKEWallet = await getBalance(BAKEContract, myAddress);
  let myBAKEWalletValue = myBAKEWallet * bake_usd;
  let totalBAKE = (myBAKE + myBAKEMining + myBAKEStake + myBAKEStakeMining + myBAKEWalletValue);
  let totalBAKEValue = totalBAKE * bake_usd;
  let totalValue = (myBNBValue + myBAKEValue + myBAKEMiningValue) + (myBAKEStakeValue + myBAKEStakeMiningValue) + (myBAKEWalletValue);
  
  // now only calculate only in BNB/BAKE
  let totalLossBNB = (BNBInvestment - myBNB) * 2;
  let lossPercent = (totalLossBNB / 2) / BNBInvestment * 100;
  
  bnb_bake = utils.currency(bnb_bake, false);
  bnb_usd = utils.currency(bnb_usd);
  bake_usd = utils.currency(bake_usd, true, 4);
  bnbBalance = utils.currency(bnbBalance, false, 8);
  bnbValue = utils.currency(bnbValue);
  bakeBalance = utils.currency(bakeBalance, false, 8);
  bakeValue = utils.currency(bakeValue);
  
  // BNB/BAKE
  myBNB = utils.currency(myBNB, false, 8);
  myBNBValue = utils.currency(myBNBValue);
  myBAKE = utils.currency(myBAKE, false, 8);
  myBAKEValue = utils.currency(myBAKEValue);
  myBAKEMining = utils.currency(myBAKEMining, false, 8);
  myBAKEMiningValue = utils.currency(myBAKEMiningValue);
  poolValue = utils.currency(poolValue);
  poolShare = utils.currency(poolShare, false,6);
  
  // BAKE/BAKE
  myBAKEStake = utils.currency(myBAKEStake, false, 8);
  myBAKEStakeValue = utils.currency(myBAKEStakeValue);
  myBAKEStakeMining = utils.currency(myBAKEStakeMining, false, 8);
  myBAKEStakeMiningValue = utils.currency(myBAKEStakeMiningValue);
  BAKEPoolValue = utils.currency(BAKEPoolValue);
  
  myBAKEWallet = utils.currency(myBAKEWallet, false, 8);
  myBAKEWalletValue = utils.currency(myBAKEWalletValue);
  totalBAKE = utils.currency(totalBAKE, false, 8)
  totalBAKEValue = utils.currency(totalBAKEValue);
  totalValue = utils.currency(totalValue);
  
  totalLossBNB = utils.currency(totalLossBNB, false, 8)
  lossPercent = utils.currency(lossPercent, false, 4)
  
  console.log('==============================')
  console.log('1 BNB = ' + bnb_usd)
  console.log('1 BNB = ' + bnb_bake + ' BAKE')
  console.log('1 BAKE = ' + bake_usd)
  console.log('==============================')
  console.log('[BNB/BAKE]')
  console.log('BNB Tokens = ' + bnbBalance + ' (' + bnbValue + ')')
  console.log('BAKE Tokens = ' + bakeBalance + ' (' + bakeValue + ')')
  console.log('==============================')
  console.log('[BNB/BAKE]')
  console.log('Pool Share = ' + poolShare + '%')
  console.log('BNB = ' + myBNB + ' (' + myBNBValue + ')')
  console.log('BAKE = ' + myBAKE + ' (' + myBAKEValue + ')')
  console.log('BAKE (Mining) = ' + myBAKEMining + ' (' + myBAKEMiningValue + ')')
  console.log('Pool Value = ' + poolValue)
  console.log('==============================')
  console.log('[BAKE/BAKE]')
  console.log('BAKE (Stake) = ' + myBAKEStake + ' (' + myBAKEStakeValue +')')
  console.log('BAKE (Mining) = ' + myBAKEStakeMining + ' (' + myBAKEStakeMiningValue + ')')
  console.log('Pool Value = ' + BAKEPoolValue)
  console.log('==============================')
  console.log('BAKE (Wallet) = ' + myBAKEWallet + ' (' + myBAKEWalletValue + ')')
  console.log('Total BNB = ' + myBNB + ' (' + myBNBValue + ')')
  console.log('Total BAKE = ' + totalBAKE + ' (' + totalBAKEValue + ')')
  console.log('Total Value = ' + totalValue)
  console.log('==============================')
  console.log('Total Loss = ' + totalLossBNB + ' BNB (' + lossPercent + '%)')
  console.log('==============================')
}

startHere();
