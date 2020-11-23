const moment = require("moment/min/moment-with-locales");
moment.locale('ja');
const cron = require("node-cron");
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json'));
const Discord = require('discord.js');
const client = new Discord.Client();
const dailyReport = require('./src/dailyReport').dailyReport;
const weeklyReport = require('./src/weeklyReport').weeklyReport;
const weeklyTweet = require('./src/weeklyTweet').weeklyTweet;
const developToolName = config.developToolName;

const {
    start
} = require("repl");
const { on } = require("process");
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
    weeklyTweet(savedData, config);
});

client.on('message', msg => {
    if (msg.author.id == client.user.id) return;
    if (msg.content.indexOf("!analyze") === -1) return;
    const isDM = msg.channel.type === "dm";
    const isAdmin = !isDM && msg.guild.members.cache.find(member => member.id == msg.author.id).permissions.any("ADMINISTRATOR");
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
                    if (!isAdmin) {
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
        let member;
        let name;
        try {
            member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user) : msg.author
            name = !isDM ? member.nickname !== null ? member.nickname : msg.guild.members.cache.find(member => member.id == command.user).user.username : msg.author.username;
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
                        `${name}さん，その調子！いまプレイしている${member.presence.activities.reduce((acc, activity) => {
                            if(activity.timestamps !== null && activity.timestamps !== undefined){
                                acc.push(`**${activity.name}**(__${moment(activity.timestamps.start).format("HH:mm")}__〜)`)
                            }
                            return acc;
                        }, []).join(", ")}はちゃんと記録されています！\n(終わり次第レポートに付け加えられます．)`
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
        } else if (command.mode === "weekly") {
            weeklyReport(msg, command, savedData);
        } else if (command.mode === "deleteAll") {
            if (!isAdmin) {
                msg.reply("エラー: 管理者のみ実行可能です");
                return;
            }
            savedData.personal = savedData.personal.filter(data => data.id != member.id);
            saveData(savedData);
            msg.reply("消したナリ");
        } else {
            msg.reply(
                `\`\`\`．
例:
- !analyze daily
- !analyze daily ${moment().format("YYYY-MM-DD")}
- !analyze weekly
- !analyze weekly ${moment().format("YYYY-MM-DD")} #指定した日時が含まれる週を選択します
\`\`\``
            )
        }
    }
});


client.on('presenceUpdate', async (oldUser, newUser) => {
    if(oldUser === undefined) return;
    let finishedAct = oldUser.activities.filter(oldActivity => {
        return oldActivity.timestamps !== null && !newUser.activities.some(newActivity => {
            //console.log(newActivity);
            return (
                /* (
                    //VSCode
                    oldActivity.applicationID == 383226320970055681 &&
                    newActivity.applicationID === oldActivity.applicationID &&
                    oldActivity.state === newActivity.state &&
                    oldActivity.state.indexOf('No workspace.') === -1
                ) || */
                (
                    oldActivity.timestamps !== null &&
                    newActivity.timestamps !== null &&
                    oldActivity.applicationID === newActivity.applicationID &&
                    moment(oldActivity.timestamps.start).isSame(newActivity.timestamps.start) &&
                    newActivity.type !== "CUSTOM_STATUS"
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
        finishedAct.forEach((act, i) => {
            finishedAct[i].timestamps.end = moment().format();
        })
        //Array.prototype.push.apply(userData.activities, finishedAct);
        let longTask = false;
        let prettyLongTask = false;
        finishedAct.forEach(finActivity => {
            if (moment(finActivity.timestamps.end).diff(finActivity.timestamps.start, "hours") > 3 && finActivity.type !== "LISTENING") {
                prettyLongTask = finActivity.name;
            } else if (moment(finActivity.timestamps.end).diff(finActivity.timestamps.start, "hours") > 1 && finActivity.type !== "LISTENING") {
                longTask = finActivity.name;
            }
            let updateTarget = userData.activities.find(dataAct => {
                return (
                    dataAct.applicationID == finActivity.applicationID &&
                    moment(dataAct.timestamps.start).isSame(finActivity.timestamps.start)
                )
            });
            if (updateTarget === undefined) {
                console.log(finActivity.applicationID);
                console.log(finActivity.timestamps.start);
                console.log("New Data")
                userData.activities.push(finActivity);
            } else {
                console.log("found")
                updateTarget = finActivity;
            }
            console.log("Estimated Time(M): " + moment(finActivity.timestamps.end).diff(finActivity.timestamps.start, "minutes"));
        })
/*         if (prettyLongTask !== false) {
            const isDevelop = (developToolName.some(name => prettyLongTask.toLowerCase().indexOf(name.toLowerCase()) !== -1))
            newUser.user.send("こんにちは！BonyAnalyzerです．超々長時間に渡る" + (isDevelop ? "開発" : prettyLongTask) + "，本当にお疲れ様です...\n長時間画面と向き合った後は，10分ぐらい目を休めることをおすすめします．\n(ここの画面で`!analyze daily`と入力すると今日の進捗，\n進捗を出し始めたのが昨日からの場合は，`!analyze daily " + moment().subtract(1, "day").format("YYYY-MM-DD") + "`で確認できますからね！)");
            userData.finishedFirstPrompt = true;
        }

        if (longTask !== false && userData.finishedFirstPrompt !== true) {
            newUser.user.send("こんにちは！BonyAnalyzerです．長時間に渡る" + longTask + "お疲れ様でした...！\nぜひここで今日の進捗を確認してみませんか？\nここの画面で`!analyze daily`と入力すると，今日の進捗を確認できます．\n(進捗を出し始めたのが昨日からの場合は，`!analyze daily " + moment().subtract(1, "day").format("YYYY-MM-DD") + "`で確認できますからね！)");
            userData.finishedFirstPrompt = true;
        } */
        saveData(savedData);

    }
});

cron.schedule('0 0 0 0 0', () => {
    weeklyTweet(savedData, config);
})

client.login(token);