const blessed = require("blessed");
const XTermExtender = require('./library_extender')
const { resolve } = require('path');
const fs = require('fs');


// Create a screen object.
const screen = blessed.screen({
    smartCSR: true,
});

screen.title = "SPAM CLIENT ORCHESTRATOR";

screen.focusable = true;

// Quit on Escape
screen.key(["escape"], function (ch, key) {
    return process.exit(0);
});

const configFile = resolve('./config.json')

let hosts = [];
let config = {};

try {
    config = require(configFile)
    monitor_host = config.monitor_server;
    hosts = config.hosts;
} catch (e) {
    console.log('Config.json file not found!')
    console.log(e)
    return
}

let selected_host = 0;
let terminal = []

const textbox = blessed.list({
    parent: screen,
    width: Math.floor(screen.width / 6),
    scrollable: true,
    border: 'line',
    label: 'Remote Servers',
    top: 0,
    bottom: 4,
    left: 0,
    padding: 1,
    clickable: false,
    style: {
        fg: 'white',
        bg: 'default',
        border: {
            fg: 'cyan',
            bold: true
        },
        selected: {
            bg: 'green',
            fg: 'white'
        },
        focus: { border: { fg: "green" } },
    }
});

const opts = {
    shell: process.env.SHELL || "sh",
    args: [],
    env: process.env,
    cwd: process.cwd(),
    cursorType: "block",
    border: "line",
    scrollback: 100000,
    clickable: true,
    style: {
        fg: "white",
        bg: "default",
        border: { fg: "cyan", bold: true },
        focus: { border: { fg: "green" } },
        scrolling: { border: { fg: "red" } }
    }
}
const textBoxCommand = hosts.find(x => typeof (x.command) === 'string')

const commandBox = blessed.textbox({
    parent: screen,
    height: 4,
    width: screen.width,
    bottom: 0,
    left: 0,
    label: "Enter command to run on all the hosts",
    border: "line",
    value: textBoxCommand ? textBoxCommand.command : 'ls',
    style: {
        border: {
            fg: "white",
        },
    },
});


const sshConnect = (index) => {
    const password = hosts[index].password.replace(/([^a-zA-Z0-9])/g, "\\$1");
    const ssh_command = ` sshpass -p ${password} ssh -o stricthostkeychecking=no ${hosts[index].username}@${hosts[index].host}\n`
    terminal[index].write('\n');
    terminal[index].injectInput(ssh_command);
    if (hosts[index].command && !automationMode) {
        terminal[index].injectInput(hosts[index].command + '\n');
    }
}

function drawBoard() {
    let num = 0;
    while (num < hosts.length) {
        textbox.pushItem(`${hosts[num].host}`)

        terminal[num] = new XTermExtender(Object.assign({}, opts, {
            left: Math.floor(screen.width / 6) + 1,
            top: 0,
            width: Math.floor(screen.width / 7) * 3,
            height: screen.height - 4,
            label: " CLI Interface  :  " + hosts[num].host + " "
        }))

        sshConnect(num);
        num++;

        if (num < hosts.length) {
            textbox.pushItem(`${hosts[num].host} `)
            terminal[num] = new XTermExtender(Object.assign({}, opts, {
                right: 0,
                top: 0,
                width: Math.floor(screen.width / 7) * 3 - 1,
                height: screen.height - 4,
                label: " CLI Interface  :  " + hosts[num].host + " "
            }))

            sshConnect(num)
            num++;
        }
    }
    screen.append(terminal[selected_host])
    if (selected_host < hosts.length - 1) {
        screen.append(terminal[selected_host + 1])
    }
    terminal[selected_host].focus()
    textbox.select(selected_host);

    screen.key(["tab"], (ch, key) => {
        if (selected_host % 2 !== 0) {
            screen.remove(terminal[selected_host - 1])
            screen.remove(terminal[selected_host])
        }
        if (selected_host < hosts.length - 1)
            selected_host++
        else
            selected_host = 0
        if (selected_host % 2 === 0) {
            screen.append(terminal[selected_host])
            if (selected_host < hosts.length - 1) {
                screen.append(terminal[selected_host + 1])
            }
        }
        terminal[selected_host].focus()
        textbox.select(selected_host)
        screen.render();
    })

    terminal.forEach((term, index) => {
        term.key("C-down", () => {
            if (!term.scrolling)
                term.scroll(0)
            const n = Math.max(1, Math.floor(term.height * 0.10))
            term.scroll(+2)
            if (Math.ceil(term.getScrollPerc()) === 100)
                term.resetScroll()
        })
        term.key("C-up", () => {
            if (!term.scrolling)
                term.scroll(0)
            const n = Math.max(1, Math.floor(term.height * 0.10))
            term.scroll(-2)
            if (Math.ceil(term.getScrollPerc()) === 100)
                term.resetScroll()
        })
    })

    textbox.show();
    textbox.select(selected_host);


    screen.key("C-a", async () => {
        commandBox.readInput()
    });

    screen.key('C-v', () => {
        const command = commandBox.getValue();
        terminal[selected_host].injectInput('\x03\n')
        terminal[selected_host].injectInput(command + '\n')
    });

    commandBox.key("enter", () => {
        let command = commandBox.getValue();
        let gap;
        let start = 0;
        if (command.includes('spammer spam')) {
            const total_accounts = 10000;
            gap = Math.floor(total_accounts / terminal.length)
        }

        for (let i = 0; i < hosts.length; i++) {
            terminal[i].injectInput('\x03\n')
            if (gap) {
                let spam_command = command + ` --start ${start} --end ${gap + start}\n`
                start += gap
                terminal[i].injectInput(spam_command)
            } else {
                terminal[i].injectInput(command + '\n')
            }
        }
    });

    screen.render();
}

drawBoard();
