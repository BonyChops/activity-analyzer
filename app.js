const moment = require("moment");
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
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
    const commandStr = msg.content.split(" ");
    let command = {
        command: commandStr[0],
        user: undefined,
        public: false
    }
    for (let index = 1; index < commandStr.length; index++) {
        const param = [null, "mode", "dates"];
        let sp = 0;
        switch (commandStr[index]) {
            case "--user":
                if (index === commandStr.length - 1) {
                    msg.reply("Error:");
                    return;
                }
                command.user = commandStr[index + 1];
                sp += 2;
                break;
            case "--public":
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

    let member;
    let name;
    const isDM = msg.channel.type === "dm";
    try {
        member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user) : msg.author
        name = member.nickname !== null ? member.nickname : !isDM ? msg.guild.members.cache.find(member => member.id == command.user).user.username : msg.author.id;
    } catch (error) {
        console.error(error);
        msg.reply("エラー: ユーザが見つかりませんでした．");
        return;
    }


    if (command.command === '!report') {
        let data = [];
        if (!savedData.personal.some(data => data.id === command.user)) {
            msg.reply(
                `\`\`\`${name}さんのデータはまだないみたいです．ゲーム，開発，なんでもやってみよう！\`\`\``
            )
        } else if (command.mode === "daily") {
            dailyReport(msg, command);
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

const dailyReport = (msg, command) => {
    const isDM = msg.channel.type === "dm";
    const member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user).user : msg.author;
    let time;
    try {
        time = command.dates === undefined ? moment() : moment(command[2]);
    } catch (error) {
        msg.reply("```エラー: " + command.dates + "は日時の指定として使えません．```");
        return;
    }
    const userData = savedData.personal.find(data => data.id === member.id);
    const targetActivity = userData.activities.filter(activity => {
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        return (
            startAt.format("YYYY-MM-DD") === endAt.format("YYYY-MM-DD")
        )
    });
    const estimatedM = targetActivity.reduce((acc, activity) => {
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        return acc + diffM;
    }, 0);
    const fields = targetActivity.map(field => {
        const timestamps = field.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffH = endAt.diff(startAt, "hours");
        const diffM = endAt.diff(startAt, "minutes");
        const isVSCode = field.applicationID === "383226320970055681";
        return {
            name: `${startAt.format("HH:mm")} 〜 ${endAt.format("HH:mm")} (${diffH >= 1 ? diffH + "時間" : diffM + "分"})`,
            value: "```" + (isVSCode ? field.name + "\n" + field.state + "\n" : field.name) + "```",
        }
    })
    const sendTo = !command.public ? msg.author : msg.channel;
    sendTo.send({
        embed: {
            title: `デイリーレポート (${time.format("MM/DD")})`,
            description: `お疲れ様！${time.format("MM/DD")}のレポートです`,
            color: 7506394,
            timestamp: new Date(),
            thumbnail: {
                url: member.avatarURL()
            },
            fields: [{
                name: "合計",
                value: estimatedM > 60 ? (estimatedM / 60).toPrecision(3) + "時間" : estimatedM + "分"
            }].concat(fields)
        }
    });
    if (!isDM) msg.react("✅");
}


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