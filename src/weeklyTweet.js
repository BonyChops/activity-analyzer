const Twitter = require("twitter");
const moment = require("moment/min/moment-with-locales");
moment.locale('ja');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json'));
const developToolName = config.developToolName;

exports.weeklyTweet = (savedData, config) => {
    const targetMoment = moment().subtract(1, "day").startOf('week');
    config.weeklyTweet.forEach(user => {
        const twInfo = user.twitter;
        const twitterClient = new Twitter({
            consumer_key: twInfo.consumer_key,
            consumer_secret: twInfo.consumer_secret,
            access_token_key: twInfo.access_token_key,
            access_token_secret: twInfo.access_token_secret
        });
        const estimatedTimeM = savedData.personal.find(data => data.id == user.discordId).activities
            .filter(activity => developToolName.some(name => activity.name.toLowerCase().indexOf(name.toLowerCase()) !== -1))
            .filter(activity => moment(activity.timestamps.start).diff(targetMoment, "days") < 7)
            .reduce((acc, activity) => {
                if (activity.timestamps !== null) {
                    acc += moment(activity.timestamps.end).diff(activity.timestamps.start, "minutes", true);
                }
                return acc;
            }, 0);
        const status = `今週(${targetMoment.format("MM/DD(ddd)")} 〜 ${targetMoment.endOf("week").format("MM/DD(ddd")})は${( estimatedTimeM >= 60 ? ((estimatedTimeM / 60).toPrecision(3) + "時間" ) : ( estimatedTimeM + "分" ))} 開発しました😎`
        twitterClient.post('statuses/update', {
                status
            })
            .then(function (tweet) {
                console.log(tweet);
            })
            .catch(function (error) {
                throw error;
            })

    })
}