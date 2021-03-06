const moment = require("moment/min/moment-with-locales");
moment.locale('ja');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json'));
const developToolName = config.developToolName;


exports.dailyReport = (msg, command, savedData) => {
    const isDM = msg.channel.type === "dm";
    const member = !isDM ? msg.guild.members.cache.find(member => member.id == command.user) : undefined;
    const user = !isDM ? member.user : msg.author;
    const name = !isDM ? member.nickname !== null ? member.nickname : msg.guild.members.cache.find(member => member.id == command.user).user.username : msg.author.username;
    const time = command.dates === undefined ? moment() : moment(command.dates);

    if (!time.isValid()) {
        msg.reply("```エラー: " + command.dates + "は日時の指定として使えません．```");
        return;
    }
    const userData = savedData.personal.find(data => data.id === user.id);
    const targetActivity = userData.activities.filter(activity => {
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        return (
            startAt.format("YYYY-MM-DD") === time.format("YYYY-MM-DD")
        )
    });
    const estimatedM = targetActivity.reduce((acc, activity) => {
        if (activity.type === "CUSTOM_STATUS") {
            return acc;
        }
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        return acc + diffM;
    }, 0);
    const estimatedDevelopM = targetActivity.reduce((acc, activity) => {
        if (activity.type === "CUSTOM_STATUS") {
            return acc;
        }
        if (!developToolName.some(name => activity.name.toLowerCase().indexOf(name.toLowerCase()) !== -1)) {
            return acc;
        }
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        return acc + diffM;
    }, 0);
    const estimatedListeningM = targetActivity.reduce((acc, activity) => {
        if (activity.type !== "LISTENING" && activity.type !== "WATCHING") {
            return acc;
        }
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        return acc + diffM;
    }, 0);
    const estimatedStreamingM = targetActivity.reduce((acc, activity) => {
        if (activity.type !== "STREAMING") {
            return acc;
        }
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        return acc + diffM;
    }, 0);
    const estimatedGamingM = targetActivity.reduce((acc, activity) => {
        if (activity.type !== "PLAYING") {
            return acc;
        }
        if (developToolName.some(name => activity.name.toLowerCase().indexOf(name.toLowerCase()) !== -1)) {
            return acc;
        }
        const timestamps = activity.timestamps;
        const startAt = moment(timestamps.start);
        const endAt = moment(timestamps.end);
        const diffM = endAt.diff(startAt, "minutes");
        return acc + diffM;
    }, 0);

    let musicCache = {};
    const fields = targetActivity.reduce((acc, field, index) => {
        let result = acc;
        if (musicCache.end !== undefined && (moment(field.timestamps.start).diff(musicCache.end, "minutes") > 2 || field.name !== "Spotify")) {
            /* const artistsStr = musicCache.artists.map((artist) => {
                return "[" + artist.songs.join(",\n") + "] - " + artist.name;
            }).join(",\n"); */
            const artistsStr = musicCache.artists.map((artist) => {
                return artist.name+`(${artist.songs.length})`;
            }).join(", ");
            const diffH = musicCache.end.diff(musicCache.start, "hours");
            const diffM = musicCache.end.diff(musicCache.start, "minutes");
            result.push({
                name: `${musicCache.start.format("HH:mm")} 〜 ${musicCache.end.format("HH:mm")} (${diffH >= 1 ? diffH + "時間" : diffM + "分"})`,
                value: "```\nSpotify "+musicCache.songs+"曲\n" + artistsStr + "```",
            });
            //console.log(musicCache);
            musicCache = {};
        }
        if (field.name === "Spotify") {
            if (musicCache.end === undefined) {
                musicCache.start = moment(field.timestamps.start);
                musicCache.songs = 0;
                musicCache.artists = [];
            }
            musicCache.songs += 1;
            musicCache.end = moment(field.timestamps.end);
            if (musicCache.artists.some(artist => artist.name === field.state)) {
                musicCache.artists.find(artist => artist.name === field.state).songs.push(field.details);
            } else {
                musicCache.artists.push({
                    name: field.state,
                    songs: [field.details]
                })
            }
            if (index + 1 === targetActivity.length) {
/*                 const artistsStr = musicCache.artists.map((artist) => {
                    return "[" + artist.songs.join(",\n") + "] - " + artist.name;
                }).join(",\n"); */
                const artistsStr = musicCache.artists.map((artist) => {
                    return artist.name+`(${artist.songs.length})`;
                }).join(", ");
                const diffH = musicCache.end.diff(musicCache.start, "hours");
                const diffM = musicCache.end.diff(musicCache.start, "minutes");
                result.push({
                    name: `${musicCache.start.format("HH:mm")} 〜 ${musicCache.end.format("HH:mm")} (${diffH >= 1 ? diffH + "時間" : diffM + "分"})`,
                    value: "```\nSpotify "+musicCache.songs+"曲\n" + artistsStr + "```",
                });
                musicCache = {};
            }
        } else {
            const timestamps = field.timestamps;
            const startAt = moment(timestamps.start);
            const endAt = moment(timestamps.end);
            const diffH = endAt.diff(startAt, "hours");
            const diffM = endAt.diff(startAt, "minutes");
            const isVSCode = field.applicationID === "383226320970055681";
            result.push({
                name: `${startAt.format("HH:mm")} 〜 ${endAt.format("HH:mm")} (${diffH >= 1 ? diffH + "時間" : diffM + "分"})`,
                value: "```" + (isVSCode ? field.name + "\n" + field.state  : field.name + (field.details !== null ? "\n" + field.details : "") ) + "```",
            });

        }
        return result;
    }, [])
    const sendTo = !command.public ? msg.author : msg.channel;
    const estimatedTimeFields = [{
        name: "合計",
        value: estimatedM >= 60 ? (estimatedM / 60).toPrecision(3) + "時間" : estimatedM + "分",
        inline: true
    }];
    if (estimatedDevelopM > 0) {
        estimatedTimeFields.push({
            name: "合計開発時間",
            value: estimatedDevelopM >= 60 ? (estimatedDevelopM / 60).toPrecision(3) + "時間" : estimatedDevelopM + "分",
            inline: true
        })
    }
    if (estimatedListeningM > 0) {
        estimatedTimeFields.push({
            name: "合計鑑賞時間",
            value: estimatedListeningM >= 60 ? (estimatedListeningM / 60).toPrecision(3) + "時間" : estimatedListeningM + "分",
            inline: true
        })
    }
    if (estimatedStreamingM > 0) {
        estimatedTimeFields.push({
            name: "合計配信時間",
            value: estimatedStreamingM >= 60 ? (estimatedStreamingM / 60).toPrecision(3) + "時間" : estimatedStreamingM + "分",
            inline: true
        })
    }
    if (estimatedGamingM > 0) {
        estimatedTimeFields.push({
            name: "**_ESTIMATED GAMING TIME_**",
            value: estimatedGamingM >= 60 ? (estimatedGamingM / 60).toPrecision(3) + "時間" : estimatedGamingM + "分",
            inline: true
        })
    }
    console.log(estimatedTimeFields.concat(fields));
    sendTo.send({
        embed: {
            title: `${name}さんのデイリーレポート (${time.format("MM/DD")})`,
            description: `お疲れ様！${time.format("MM/DD")}のレポートです．`,
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
                description: `いまプレイしている${member.presence.activities.reduce((acc, activity) => {
                    if(activity.timestamps !== null && activity.timestamps !== undefined){
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