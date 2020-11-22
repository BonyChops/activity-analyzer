const moment = require("moment");
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const dailyReport = require('./src/dailyReport').dailyReport;
const {
    start
} = require("repl");
const config = JSON.parse(fs.readFileSync('./config.json'));
const saveData = data => {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 4))
}
let savedData = {
    personal: [],
    guilds: []
};
if (!fs.existsSync('./data.json')) {
    saveData(savedData);
} else {
    savedData = JSON.parse(fs.readFileSync('./data.json'));
}
const token = config.token;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(moment().format("YYYY-MM-DD"));
});

client.on('message', msg => {
    if (msg.author.id == client.user.id) return;
    const isDM = msg.channel.type === "dm";
    const commandStr = msg.content.split(" ");
    let command = {
        command: commandStr[0],
        user: undefined,
        public: false
    }
    console.log(commandStr)

    if (command.command === '!analyze') {
        let sp = 0;
        for (let index = 1; index < commandStr.length; index++) {
            const param = [null, "mode", "dates"];
            switch (commandStr[index]) {
                case "--user":
                    if (isDM) {
                        msg.reply("エラー: --userはDMでは使用できません．");
                        return;
                    }
                    if (!msg.guild.members.cache.find(member => member.id == msg.author.id).permissions.any("ADMINISTRATOR")) {
                        msg.reply("エラー: 鯖の管理者以外は--userを使用することはできません");
                        return;
                    }
                    if (index === commandStr.length - 1) {
                        msg.reply("Error:");
                        return;
                    }
                    command.user = commandStr[index + 1];
                    index += 1;
                    sp += 2;
                    break;
                case "--public":
                    if (isDM) {
                        msg.reply("エラー: --publicはDMでは使用できません．");
                        return;
                    }
                    command.public = true;
                    sp += 1;
                    break;

                default:
                    command[param[index - sp]] = commandStr[index];
                    break;
            }
        }
        if (command.user === undefined) {
            command.user = msg.author.id;
        }
        console.log(msg.guild.members.cache.find(member => member.id == msg.author.id).permissions.any("ADMINISTRATOR"));
        console.log("↑");
        let member;
        let name;
        try {
            member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user) : msg.author
            name = member.nickname !== null ? member.nickname : !isDM ? msg.guild.members.cache.find(member => member.id == command.user).user.username : msg.author.username;
        } catch (error) {
            console.error(error);
            msg.reply("エラー: ユーザが見つかりませんでした．");
            return;
        }
        let data = [];
        if (!savedData.personal.some(data => data.id === command.user)) {
            if (member.presence.activities.length > 0) {
                try {
                    msg.reply(
                        `\`\`\`${name}さん，その調子！いまプレイしている**${member.presence.activities[0].name}**(__${moment(member.presence.activities[0].timestamps.start).format("HH:mm")}__〜)はちゃんと記録されています！\n(終わり次第レポートに付け加えられます．)\`\`\``
                    )
                } catch (error) {
                    console.error(error);
                    msg.reply(
                        "ごめんなさい...なにか内部エラーがあったみたいです...\n" + "```＊ 悲しいね...```"
                    )
                }

            } else {
                msg.reply(
                    `\`\`\`${name}さんのデータはまだないみたいです．ゲーム，開発，なんでもやってみよう！\`\`\``
                )
            }
        } else if (command.mode === "daily") {
            dailyReport(msg, command, savedData);
        } else {
            msg.reply(
                `\`\`\`不正なコマンドです(${command.mode})．
例:
- !report daily
- !report daily ${moment().format("YYYY-MM-DD")}
- !report weekly
- !report weekly ${moment().format("YYYY-MM-DD")} #指定した日時が含まれる週を選択します
\`\`\``
            )
        }
    }
});


client.on('presenceUpdate', async (oldUser, newUser) => {
    let finishedAct = oldUser.activities.filter(oldActivity => {
        return !newUser.activities.some(newActivity => {
            return (
                /* (
                    //VSCode
                    oldActivity.applicationID == 383226320970055681 &&
                    newActivity.applicationID === oldActivity.applicationID &&
                    oldActivity.state === newActivity.state &&
                    oldActivity.state.indexOf('No workspace.') === -1
                ) || */
                (
                    oldActivity.applicationID === newActivity.applicationID &&
                    moment(oldActivity.timestamps.start).isSame(newActivity.timestamps.start)
                )
            )
        })
    })
    console.log(finishedAct);
    if (finishedAct.length > 0) {
        if (!savedData.personal.some(data => data.id === newUser.userID)) {
            savedData.personal.push({
                id: newUser.userID,
                name: newUser.user.username,
                activities: []
            });
            console.log("User data not found. Created.");
        }
        let userData = savedData.personal.find(data => data.id == newUser.userID);
        finishedAct.forEach(act => {
            act.timestamps.end = moment().format();
        })
        //Array.prototype.push.apply(userData.activities, finishedAct);
        finishedAct.forEach(finActivity => {
            let updateTarget = userData.activities.find(dataAct => {
                return (
                    dataAct.applicationID == finActivity.applicationID &&
                    moment(dataAct.timestamps.start).isSame(finActivity.timestamps.start)
                )
            });
            if (updateTarget === undefined) {
                console.log(finActivity.applicationID);
                console.log(finActivity.timestamps.start);
                console.log("not found")
                userData.activities.push(finActivity);
            } else {
                console.log("found")
                updateTarget = finActivity;
            }
        })


        saveData(savedData);
    }
})

client.login(token);