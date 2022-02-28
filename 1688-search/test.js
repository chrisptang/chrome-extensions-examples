['2020-01-01:2020-04-01:online@minisothai.com', '2020-04-01:2020-07-01:online@minisothai.com', '2020-07-01:2020-10-01:online@minisothai.com', '2020-10-01:2021-01-01:online@minisothai.com', '2021-04-01:2021-07-01:online@minisothai.com', '2021-07-01:2021-10-01:online@minisothai.com']



let callback = function (date) {
    console.log(date)
    let r = new XMLHttpRequest();
    r.open("POST", 'https://schedule.infra.minisobos.com/xxl-job-admin/jobinfo/trigger');
    let param = new FormData();
    param.append("id", 20);
    param.append("executorParam", date);
    param.append("addressList", "");
    r.send(param);
}

dates = ['2020-07-01:2020-10-01:online@minisothai.com', '2020-10-01:2021-01-01:online@minisothai.com', '2021-04-01:2021-07-01:online@minisothai.com', '2021-07-01:2021-10-01:online@minisothai.com']
let timeouts = 1;
dates.forEach((d) => {
    let cb = callback.bind(this, d);
    setTimeout(cb, timeouts * 600 * 1000);
    timeouts++;
});


async function getData(url = '') {
    // Default options are marked with *
    const response = await fetch(url);
    return response.json(); // parses JSON response into native JavaScript objects
}

function sendResult(json, callback) {
    console.log(json);
    let url = 'http://localhost:1688/api/1688search/sink';
    let request = new XMLHttpRequest();
    request.open('POST', url);
    request.setRequestHeader("X-Source", "shopee");
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify(json));
    if (callback) {
        setTimeout(callback, 2000);
    }
}

async function callback(i) {
    let url = `https://shopee.co.id/api/v4/search/search_items?by=pop&limit=20&match_id=11042921&newest=${i * 20}&order=desc&page_type=search&scenario=PAGE_OTHERS&version=2`;
    console.log("requesting:", url);
    let json = await getData(url);
    sendResult(json);
}
for (let i = 0; i < 100; i++) {
    let cb = callback.bind(this, i);
    setTimeout(cb, i * 10 * 1000);
}