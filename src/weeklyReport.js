const moment = require("moment");
moment.locale('jp');
exports.weeklyReport = (msg, command, savedData) => {
    const isDM = msg.channel.type === "dm";
    const member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user) : undefined;
    const user = !isDM ? member.user : msg.author;
    const name = !isDM ? member.nickname !== null ? member.nickname : msg.guild.members.cache.find(member => member.id == command.user).user.username : msg.author.username;
    console.log(msg.author.username)
    let time;
    try {
        time = command.dates === undefined ? moment().startOf('week') : moment(command.dates).startOf('week');
    } catch (error) {
        console.error(error);
        msg.reply("```エラー: " + command.dates + "は日時の指定として使えません．```");
        return;
    }
    console.log(command.dates)
    if (time == "Invalid date") {
        msg.reply("```エラー: " + command.dates + "は日時の指定として使えません．```");
        return;
    }
    const developToolName = ["Visual Studio", "Eclipse", "Jet Brains", "iTerm"];
    const userData = savedData.personal.find(data => data.id === member.id);
    let weeklyEstimatedTimes = [...Array(5).keys()];
    weeklyEstimatedTimes["total"] = {};
    weeklyEstimatedTimes.forEach(part => part = {
        total: 0,
        develop: 0,
        listening: 0,
        streaming: 0,
        gaming: 0
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
        weeklyEstimatedTimes[startAt.diff(time, "days")].total += diffM;
        weeklyEstimatedTimes["total"].total += diffM;
        if (activity.type === "CUSTOM_STATUS" && developToolName.some(name => activity.name.toLowerCase().indexOf(name.toLowerCase()) !== -1)) {
            weeklyEstimatedTimes[startAt.diff(time, "days")].develop += diffM;
            weeklyEstimatedTimes["total"].develop += diffM;
        } else if (activity.type === "LISTENING" || activity.type === "WATCHING") {
            weeklyEstimatedTimes[startAt.diff(time, "days")].listening += diffM;
            weeklyEstimatedTimes["total"].listening += diffM;
        } else if (activity.type === "STREAMING") {
            weeklyEstimatedTimes[startAt.diff(time, "days")].streaming += diffM;
            weeklyEstimatedTimes["total"].streaming += diffM;
        } else {
            weeklyEstimatedTimes[startAt.diff(time, "days")].gaming += diffM;
            weeklyEstimatedTimes["total"].gaming += diffM;
        }
    })

    const fields = weeklyEstimatedTimes.map((activity, index) => {
        if (weeklyEstimatedTimes[index].total === 0 || index === "total"){
            return;
        }
        let arr = [];
        arr.push("合計時間: " + activity.total);
        arr.push("合計開発時間: " + activity.develop);
        arr.push("合計視聴時間: " + activity.listening);
        arr.push("合計配信時間: " + activity.streaming);
        arr.push("__ESTIMATED GAMING TIME__: " + activity.gaming);
        const value = arr.join(",\n");
        return{
            name: time.add(index, "days").format("MM/DD(ddd)"),
            value
        }
    })
    const sendTo = !command.public ? msg.author : msg.channel;
    const estimatedTimeFields = [{
        name: "合計",
        value: weeklyEstimatedTimes["total"].total > 60 ? (weeklyEstimatedTimes["total"].total / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes["total"].total + "分",
        inline: true
    }];
    console.log(weeklyEstimatedTimes["total"].develop);
    if (weeklyEstimatedTimes["total"].develop > 0) {
        estimatedTimeFields.push({
            name: "合計開発時間",
            value: weeklyEstimatedTimes["total"].develop > 60 ? (weeklyEstimatedTimes["total"].develop / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes["total"].develop + "分",
            inline: true
        })
    }
    if (weeklyEstimatedTimes["total"].listening > 0) {
        estimatedTimeFields.push({
            name: "合計鑑賞時間",
            value: weeklyEstimatedTimes["total"].listening > 60 ? (weeklyEstimatedTimes["total"].listening / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes["total"].listening + "分",
            inline: true
        })
    }
    if (weeklyEstimatedTimes["total"].streaming > 0) {
        estimatedTimeFields.push({
            name: "合計配信時間",
            value: weeklyEstimatedTimes["total"].streaming > 60 ? (weeklyEstimatedTimes["total"].streaming / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes["total"].streaming + "分",
            inline: true
        })
    }
    if (weeklyEstimatedTimes["total"].gaming > 0) {
        estimatedTimeFields.push({
            name: "**_ESTIMATED GAMING TIME_**",
            value: weeklyEstimatedTimes["total"].gaming > 60 ? (weeklyEstimatedTimes["total"].gaming / 60).toPrecision(3) + "時間" : weeklyEstimatedTimes["total"].gaming + "分",
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
    if (member.presence.activities.length > 0) {
        sendTo.send({
            embed: {
                title: `ヒント:`,
                description: `いまプレイしている**${member.presence.activities[0].name}**(__${moment(member.presence.activities[0].timestamps.start).format("HH:mm")}__〜)もちゃんと記録されています！\n(終わり次第レポートに付け加えられます．)`,
                color: "#006050",
                timestamp: new Date()
            }
        });
    }
    if (!isDM && !command.public) msg.react("✅");
}