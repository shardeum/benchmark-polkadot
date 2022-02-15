#!/usr/bin/env node
import fs from 'fs'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { Keyring } from "@polkadot/keyring";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { BlockHash } from "@polkadot/types/interfaces";


let api: ApiPromise

let keyPairs = new Map<number, KeyringPair>()


/**
 * Establish a connection to the network
 */
export async function establishConnection(): Promise<void> {
  // Initialise the provider to connect to the local node
  const provider = new WsProvider('ws://127.0.0.1:9944');

  // Create the API and wait until ready
  api = await ApiPromise.create({ provider });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true)
    }, ms)
  })
}

interface accountsOptions {
  number: number
}

const createAccounts = async (number: number): Promise<void> => {
  console.log("Endowing all users from Alice account...");
  let keyring = new Keyring({ type: 'sr25519' });
  let aliceKeyPair = keyring.addFromUri("//Alice");
  let aliceInfo: any = (await api.query.system.account(aliceKeyPair.address));
  let aliceNonce = aliceInfo.nonce.toNumber();

  let finalized_transactions = 0;

  let FINALISATION_TIMEOUT = 60000;

  for (let seed = 0; seed < number; seed++) {
    let keypair = keyring.addFromUri(seedFromNum(seed));
    keyPairs.set(seed, keypair);

    // should be greater than existential deposit.
    let amount = 100 * Number(api.consts.balances.existentialDeposit);
    let transfer = api.tx.balances.transfer(keypair.address, amount);

    await transfer.signAndSend(aliceKeyPair, { nonce: aliceNonce }, ({ status }) => {
      if (status.isFinalized) {
        finalized_transactions++;
        fs.appendFile('accounts.json', JSON.stringify(keypair, null, 0), function (err) {
          if (err) throw err;
          // console.log(`Created and saved ${seed + 1} accounts in accounts.json.`);
        });
      }
    });
    aliceNonce++;
  }

  // console.log("Alice nonce is " + formatBalance(aliceNonce.data.free, { withSi: false, forceUnit: '-' },
  //   12));

  console.log("All users endowed from Alice account!");

  console.log("Wait for transactions finalisation");
  await new Promise(r => setTimeout(r, FINALISATION_TIMEOUT));
  console.log(`Finalized transactions ${finalized_transactions}`);
  // process.exit();
}

yargs(hideBin(process.argv))
  .command(
    'accounts',
    'generate accounts --number [number]',
    () => { },
    async (argv: accountsOptions) => {
      await establishConnection()
      await createAccounts(argv.number).catch(console.error).finally(() => process.exit());
    }
  )
  .option('number', {
    alias: 'n',
    type: 'number',
    description: 'number of accounts',
  }).argv

interface spamOptions {
  duration: number
  rate: number
  start: number
  end: number
}

yargs(hideBin(process.argv))
  .command(
    'spam',
    'spam nodes for [duration] seconds at [rate] tps',
    () => { },
    async (argv: spamOptions) => {
      await establishConnection()
      await spam(argv).catch(console.error).finally(() => process.exit());
    }
  )
  .option('duration', {
    alias: 'd',
    type: 'number',
    description: 'The duration (in seconds) to spam the network',
  })
  .option('start', {
    alias: 's',
    type: 'number',
    description: 'the start index to use from the accounts',
  })
  .option('end', {
    alias: 'e',
    type: 'number',
    description: 'the end index to use from the accounts',
  })
  .option('rate', {
    alias: 'r',
    type: 'number',
    description: 'The rate (in tps) to spam the network at',
  }).argv


const spam = async (argv: spamOptions) => {
  let tps = argv.rate
  let duration = argv.duration
  let txCount = tps * duration
  let start = argv.start ? argv.start : 0
  let accounts
  try {
    accounts = fs.readFileSync('accounts.json', 'utf8')
    accounts = accounts.replaceAll('}{', '},{')
    accounts = '[' + accounts + ']'
    accounts = JSON.parse(accounts)
    console.log(
      `Loaded ${accounts.length} account${accounts.length > 1 ? 's' : ''
      } from accounts.json`
    )
  } catch (error) {
    console.log(`Couldn't load accounts from file: ${error.message}`)
    return
  }
  let end = argv.end ? argv.end : accounts.length

  console.log(start, end)
  // shuffle(accounts)

  let keyring = new Keyring({ type: 'sr25519' });
  let aliceKeyPair = keyring.addFromUri("//Alice");
  const TOKENS_TO_SEND = 1

  let nonces = [];

  // console.log("Fetching nonces for accounts...");
  // for (let i = 0; i <= accounts.length; i++) {
  //   let stringSeed = seedFromNum(i);
  //   let keys = keyring.addFromUri(stringSeed);
  //   let accountInfo: any = (await api.query.system.account(keys.address));
  //   let nonce = accountInfo.nonce.toNumber();
  //   nonces.push(nonce)
  // }

  // const filteredAccount = accounts.slice(start, txCount)
  const filteredAccountKeyPair = []
  for (let i = start; i < end; i++) {
    let senderKeyPair = keyring.addFromUri(seedFromNum(i));
    filteredAccountKeyPair.push(senderKeyPair)
    let accountInfo: any = (await api.query.system.account(senderKeyPair.address));
    let nonce = accountInfo.nonce.toNumber();
    nonces.push(nonce)
  }

  let k = 0
  const waitTime = (1 / tps) * 1000
  let currentTime
  let sleepTime
  let elapsed
  let transactions = []
  for (let i = 0; i < txCount; i++) {
    // console.log('Injected tx:', i + 1)
    if (k > nonces.length - 1) {
      k = 0
    }

    let senderKeyPair = filteredAccountKeyPair[k]

    // let accountInfo: any = (await api.query.system.account(senderKeyPair.address));
    let nonce = nonces[k];
    nonces[k]++


    let transfer = api.tx.balances.transfer(aliceKeyPair.address, TOKENS_TO_SEND);
    let signedTransaction = transfer.sign(senderKeyPair, { nonce });
    transactions.push(signedTransaction)
    k++
  }
  let LatestBlockBeforeSpamming: any = (await api.rpc.chain.getBlock()).block.header.number.toHuman();
  console.log('LatestBlockBeforeSpamming', LatestBlockBeforeSpamming)
  let spamStartTime = Math.floor(Date.now() / 1000)
  let lastTime = Date.now()
  for (let i = 0; i < txCount; i++) {

    try {
      transactions[i].send(({ status }) => {
        // console.log(i, status)
        if (status.isFinalized) {
          // console.log(i, 'finalized')
        }
      })
    } catch (e) {
      console.log(e)
    }
    currentTime = Date.now()
    elapsed = currentTime - lastTime
    sleepTime = waitTime - elapsed
    if (sleepTime < 0) sleepTime = 0
    await sleep(sleepTime)
    lastTime = Date.now()

  }
  let spamEndTime = Math.floor(Date.now() / 1000)
  var timeDiff = spamEndTime - spamStartTime; //in ms
  // get seconds 
  var seconds = Math.round(timeDiff);

  let LatestBlockAfterSpamming = (await api.rpc.chain.getBlock()).block.header.number.toHuman();
  console.log('LatestBlockAfterSpamming', LatestBlockAfterSpamming)
  console.log('totalSpammingTime', seconds)

}


function seedFromNum(seed: number): string {
  return '//user//' + ("0000" + seed).slice(-4);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}


function shuffle(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

async function getBlockStats(hash?: BlockHash | undefined): Promise<any> {
  const signedBlock = hash ? await api.rpc.chain.getBlock(hash) : await api.rpc.chain.getBlock();

  // the hash for each extrinsic in the block
  let timestamp = signedBlock.block.extrinsics.find(
    ({ method: { method, section } }) => section === 'timestamp' && method === 'set'
  )!.method.args[0].toString();

  let date = new Date(+timestamp);
  // console.log(signedBlock.block)

  return {
    timestamp,
    transactions: signedBlock.block.extrinsics.length,
    parent: signedBlock.block.header.parentHash,
    blockNumber: signedBlock.block.header.number.toString(),
  }
}


interface tpsOptions {
  startblock: number,
  output: string
}

yargs(hideBin(process.argv))
  .command(
    'check_tps',
    'get tps  --startblock [number] --txs [number]',
    () => { },
    async (argv: tpsOptions) => {
      await establishConnection()
      getTPS(argv).catch(console.error).finally(() => process.exit());
    }
  )
  .option('startblock', {
    alias: 's',
    type: 'number',
    description: 'end of block',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'file to save the log',
  }).argv

const getTPS = async (argv: tpsOptions) => {
  let startblock = argv.startblock
  let output = argv.output
  let startTime
  let endTime
  let endblock
  let totalTransactions = 0
  let latestBlock = await getBlockStats();
  // console.log(latestBlock.blockNumber, latestBlock.transactions)
  let blockNumber = parseInt(latestBlock.blockNumber)
  fs.appendFile(output, JSON.stringify(latestBlock, null, 2), function (err) {
    if (err) throw err;
  });
  while (blockNumber > startblock) {
    blockNumber--
    latestBlock = await getBlockStats(latestBlock.parent);
    let { timestamp, transactions } = latestBlock
    if (transactions > 2) {
      if (!endblock) {
        endblock = blockNumber
        endTime = timestamp
      }
      totalTransactions += transactions - 2;
      fs.appendFile(output, JSON.stringify(latestBlock, null, 2), function (err) {
        if (err) throw err;
      });
    }
    startTime = timestamp
    console.log(blockNumber, transactions)
  }
  let averageTime = (endTime - startTime) / 1000 || 1;
  console.log('startBlock', startblock, 'endBlock', endblock)
  console.log(`total time`, averageTime)
  console.log(`total txs:`, totalTransactions)
  console.log(`avg tps`, totalTransactions / averageTime)
}
