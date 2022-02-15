# Before Running

1. First make sure you have installed `sshpass` in the local machine.

```
    sudo apt install sshpass
```

2. Install dependencies

```
    npm install
```

3. Make sure you have installed `spammer` repo in all the remote machines.

```
    repo link : https://gitlab.com/shardeum/smart-contract-platform-comparison/solana/spam-client
```

3. Create a `config.json` file in the project root and add required config and hosts to it like this example.

```
{
    "hosts":    [
        {
            "host": "host_ip",
            "username": "your_username",
            "password": "your_password"
        }
    ]
}

```

4. Run the program with command

```
    node orchestrator.js (or) npm run app
```

5. Navigate the related host's display

- With `Tab` key.
- For quitting this run, use `esc` key

6. To scroll through the host's terminal page, use

- `Ctrl+Up` key for scroll up
- `Ctrl+Down` key for scroll down

7. For the commandBox on the bottom left

- Press `Ctrl+A` key for focus
- Press `Enter` key after entering command

8. For issuing the commandBox command on the selected host only

- Press `Ctrl+V` key in the selected box
