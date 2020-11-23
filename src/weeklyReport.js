const moment = require("moment/min/moment-with-locales");
moment.locale('ja');
exports.weeklyReport = (msg, command, savedData) => {
    const isDM = msg.channel.type === "dm";
    const member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user) : undefined;
    const user = !isDM ? member.user : msg.author;
    const name = !isDM ? member.nickname !== null ? member.nickname : msg.guild.members.cache.find(member => member.id == command.user).user.username : msg.author.username;
    console.log(msg.author.username)
    const time = command.dates === undefined ? moment().startOf('week') : moment(command.dates).startOf('week');

    console.log(command.dates)
    if (time == "Invalid date") {
        msg.reply("```エラー: " + command.dates + "は日時の指定として使えません．```");
        return;
    }
    const developToolName = ["Visual Studio", "Eclipse", "JetBrains", "iTerm"];
    const userData = savedData.personal.find(data => data.id === user.id);
    let weeklyEstimatedTimes = [...Array(8).keys()];
    weeklyEstimatedTimes.forEach(part => weeklyEstimatedTimes[part] = {
        total: 0,
        develop: 0,
        listening: 0,
        streaming: 0,
        gaming: 0,
        titles: []
    })
    const targetActivity = userData.activities.filter(activity => {
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        return (
            startAt.diff(time, "days") < 7
        )
    });

    targetActivity.forEach(activity => {
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        const name = activity.name;
        weeklyEstimatedTimes[startAt.diff(time, "days")].total += diffM;
        weeklyEstimatedTimes[7].total += diffM;
        if(!weeklyEstimatedTimes[startAt.diff(time, "days")].titles.includes(name)){
            weeklyEstimatedTimes[startAt.diff(time, "days")].titles.push(name);
        }
        if (activity.type !== "CUSTOM_STATUS" && developToolName.some(name => activity.name.toLowerCase().indexOf(name.toLowerCase()) !== -1)) {
            weeklyEstimatedTimes[startAt.diff(time, "days")].develop += diffM;
            weeklyEstimatedTimes[7].develop += diffM;
        } else if (activity.type === "LISTENING" || activity.type === "WATCHING") {
            weeklyEstimatedTimes[startAt.diff(time, "days")].listening += diffM;
            weeklyEstimatedTimes[7].listening += diffM;
        } else if (activity.type === "STREAMING") {
            weeklyEstimatedTimes[startAt.diff(time, "days")].streaming += diffM;
            weeklyEstimatedTimes[7].streaming += diffM;
        } else {
            weeklyEstimatedTimes[startAt.diff(time, "days")].gaming += diffM;
            weeklyEstimatedTimes[7].gaming += diffM;
        }
    })
    console.log(weeklyEstimatedTimes);
    time.subtract(1, "day");
    const fields = weeklyEstimatedTimes.reduce((acc, activity, index) => {
        time.add(1, "day");
        if (weeklyEstimatedTimes[index].total === 0 || index === 7) {
            return acc;
        }
        let arr = [];
        arr.push("**合計時間**: " + (activity.total > 60 ? (activity.total / 60).toPrecision(3) + "時間" : activity.total + "分"));
        if (activity.develop > 0) arr.push("**合計開発時間**: " + (activity.develop > 60 ? (activity.develop / 60).toPrecision(3) + "時間" : activity.develop + "分"));
        if (activity.listening > 0) arr.push("**合計視聴時間**: " + (activity.listening > 60 ? (activity.listening / 60).toPrecision(3) + "時間" : activity.listening + "分"));
        if (activity.streaming > 0) arr.push("**合計配信時間**: " + (activity.streaming > 60 ? (activity.streaming / 60).toPrecision(3) + "時間" : activity.streaming + "分"));
        if (activity.gaming > 0) arr.push("**_ESTIMATED GAMING TIME_**: " + (activity.gaming > 60 ? (activity.gaming / 60).toPrecision(3) + "時間" : activity.gaming + "分"));
        arr.push(`\`\`\` ${activity.titles.join(", ")} \`\`\``);
        const value = arr.join(",\n");
        console.log(index);
        acc.push({
            name: time.format("MM/DD(ddd)"),
            value
        });
        return acc;
    }, [])
    const sendTo = !command.public ? msg.author : msg.channel;
    const estimatedTimeFields = [{
        name: "合計",
        value: weeklyEstimatedTimes[7].total > 60 ? (weeklyEstimatedTimes[7].total / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes[7].total + "分",
        inline: true
    }];
    console.log(weeklyEstimatedTimes[7].develop);
    if (weeklyEstimatedTimes[7].develop > 0) {
        estimatedTimeFields.push({
            name: "合計開発時間",
            value: weeklyEstimatedTimes[7].develop > 60 ? (weeklyEstimatedTimes[7].develop / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes[7].develop + "分",
            inline: true
        })
    }
    if (weeklyEstimatedTimes[7].listening > 0) {
        estimatedTimeFields.push({
            name: "合計鑑賞時間",
            value: weeklyEstimatedTimes[7].listening > 60 ? (weeklyEstimatedTimes[7].listening / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes[7].listening + "分",
            inline: true
        })
    }
    if (weeklyEstimatedTimes[7].streaming > 0) {
        estimatedTimeFields.push({
            name: "合計配信時間",
            value: weeklyEstimatedTimes[7].streaming > 60 ? (weeklyEstimatedTimes[7].streaming / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes[7].streaming + "分",
            inline: true
        })
    }
    if (weeklyEstimatedTimes[7].gaming > 0) {
        estimatedTimeFields.push({
            name: "**_ESTIMATED GAMING TIME_**",
            value: weeklyEstimatedTimes[7].gaming > 60 ? (weeklyEstimatedTimes[7].gaming / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes[7].gaming + "分",
            inline: true
        })
    }

    sendTo.send({
        embed: {
            title: `${name}さんのウィークリーレポート (${time.format("MM/DD")} 〜 ${time.endOf("week").format("MM/DD")})`,
            description: `お疲れ様！${time.format("MM/DD")} 〜 ${time.endOf("week").format("MM/DD")}のレポートです．`,
            color: "#006050",
            timestamp: new Date(),
            thumbnail: {
                url: user.avatarURL()
            },
            fields: estimatedTimeFields.concat(fields)
        }
    });
    if (!isDM && member.presence.activities.length > 0) {
        sendTo.send({
            embed: {
                title: `ヒント:`,
                description: `いまプレイしている${member.presence.activities.reduce(activity => {
                    if(activity.timestamps !== null && activity.timestamps.start !== null){
                        acc.push(`**${activity.name}**(__${moment(activity.timestamps.start).format("HH:mm")}__〜)`)
                    }
                    return acc;
                }, []).join(", ")}もちゃんと記録されています！\n(終わり次第レポートに付け加えられます．)`,
                color: "#006050",
                timestamp: new Date()
            }
        });
    }
    if (!isDM && !command.public) msg.react("✅");
}