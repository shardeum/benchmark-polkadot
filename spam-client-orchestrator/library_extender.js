const XTerm = require("blessed-xterm")

class XTermExtender extends XTerm {
    constructor(options = {}) {
        super(options);
        this.lastCommandResult = ''
        /*  process data on PTY  */
        this.pty.on("data", (data) => {
            this.lastCommandResult = data
            this.emit("result", data)
        })

    }

    getLastCommandResult() {
        return this.lastCommandResult;
    }

}

module.exports = XTermExtender
