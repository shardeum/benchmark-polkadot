## Polkadot TPS Test for Coin Transfer

##### Hardware: dedicated server at `nocix.net`

- Processor 2x E5-2660 @ 2.2GHz / 3GHz Turbo 16 Cores / 32 thread
- Ram 96 GB DDR3
- Disk 960 GB SSD
- Bandwidth 1Gbit Port: 200TB Transfer
- Operating System Ubuntu 18.04 (Bionic)

##### Network setup

- A network of 5 nodes was run.
- All nodes used the same IP, but different ports
- All nodes had mining turned on; each was a block producer

##### Test setup for native coin transfer

- 10000 accounts were created for coin transfer
- 10000 native coin txs were submitted to the network as fast as possible
  - Each tx moved 1 DOT between two different randomly chosen accounts
  - The number of accounts was chosen to be equal to the number of total txs so that there would be a low chance of a tx getting rejected due to another transaction from the same account still pending.

##### Test result

- Tests are taken starting from 500 tps to 4000 tps for 10 seconds. Time between the start of the test and the last block to process txs from the test was measured.
- Total txs/ Spam rate (TPS) => Average tps
  ```
   2500  /  500 =>  138 , 208
   5000  / 1000 =>  277 ,
   7500  / 1500 =>  416 , 624 , 414
  10000  / 2000 =>  413 , 416
  10000  / 2500 =>  464 , 413 , 445
   9000  / 3000 =>  499 , 495
   8000  / 4000 =>  444
  ```
- Estimated average tps is **400 - 500 TPS**

##### Instructions to recreate this test

1.  Install required tools and dependencies.
    1. [https://guide.kusama.network/docs/maintain-guides-how-to-validate-kusama/](https://guide.kusama.network/docs/maintain-guides-how-to-validate-kusama/)
    2. Install Rust
    3. sudo apt install make clang pkg-config libssl-dev build-essential
    4. [https://guide.kusama.network/docs/maintain-guides-how-to-validate-kusama/#debian-based-debian-ubuntu](https://guide.kusama.network/docs/maintain-guides-how-to-validate-kusama/#debian-based-debian-ubuntu)
2.  We will make a local network of 5 validators.

    1.  Referencing [https://github.com/paritytech/polkadot#local-two-node-testnet](https://github.com/paritytech/polkadot#local-two-node-testnet), we will create a network with a pre-defined network specification called **_local_ **with 5 pre-defined keys known as
        1. --alice
        2. --bob
        3. --charlie
        4. --dave
        5. --eve
    2.  First, start the first node (alice) in one terminal.

        - `polkadot --chain=kusama-local --alice -d [directory-name-to-save-data] --detailed-log-output --rpc-cors all 2>> [filename].log`
          e.g.
          polkadot --chain=kusama-local --alice -d node01 --detailed-log-output --rpc-cors all 2>> node01.log

    3.  Start other nodes by connecting with the first node. Use a different key from [--bob, --charlie, --dave, --eve ] keys list when starting a node.

        1. `polkadot --chain=kusama-local --[pre-defined-key-name] -d [directory-name-to-save-data] --detailed-log-output --port [port-number] --bootnodes '/ip4/127.0.0.1/tcp/30333/p2p/ALICE_BOOTNODE_ID_HERE' --rpc-cors all 2>> [filename].log`
        2. Ensure you replace ALICE_BOOTNODE_ID_HERE with the node ID from the output of the first terminal.
           e.g.

           polkadot --chain=kusama-local --bob -d node02 --detailed-log-output --port 30334 --bootnodes '/ip4/127.0.0.1/tcp/30333/p2p/12D3KooWHyvf1hHtDAb6nsXj6KjLNecEa9pqPCQfofEjtD3Wnavx' --rpc-cors all 2>> node02.log

    4.  The nodes should peer together and start producing blocks by now. To confirm that it’s working well, look into a node’s log output
        1. `Idle (4 peers), best: #3 (0x632d…a43f), finalized #1`
        2. _4 peers_ means it’s connecting with 4 other nodes.
        3. _finalized #[number>0]_ means the node is participating in producing blocks.

3.  Custom Scripts used for running transactions to the network

    1.  [https://gitlab.com/shardeum/smart-contract-platform-comparison/polkadot](https://gitlab.com/shardeum/smart-contract-platform-comparison/polkadot)
    2.  cd spam-client && npm install && npm link
    3.  To generate accounts and fund the accounts with some balance.
        1. `spammer accounts --number [number]`
        2. Account creation and funding the account take time.
        3. These accounts are being funded from ‘Alice’ account when generating accounts.
    4.  Spam the network with these accounts and check the average TPS in each spam with step (5)

        1. `spammer spam --duration [number] --rate [number]`
           e.g. To spam the network for 5 seconds with 10 tps
           spammer spam --duration 5 --rate 10

        2. Use the _latestBlockBeforespamming_ block number to check the tps of that spam.

    5.  Check the average TPS of the spam.

        1. `spammer check_tps --startblock[block-number] --output [json_file_name]`
           e.g. spammer check_tps --startblock 158 --output s158.json

    6.  cd spam-client-orchestrator && npm install
        1. In order to send higher txs, we use spam-client-orchestrator to spam from many terminals.
        2. Add the value (number of accounts you created in step no. 3(3) ) in _total_accounts_ variable in orchestrator.js. This will divide how many accounts to use in each client.
        3. Check out the README for usage.
