console.log("running in content script");

KEYWORDS_1688 = 'KEYWORDS_1688';

DETAILS_1688 = 'DETAILS_1688';

app = document.getElementById("app") || document.getElementById('root-container') || document.getElementById('content') || document.body;

let search = location.search.substring(1);
let result = {};
result.page = {}
if (!!search && search.length > 1) {
    result.page = JSON.parse('{"' + search.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
}
result.page.url = document.location.toString();

let keywordList = [];
let isRunning = false;
chrome.storage.sync.get(KEYWORDS_1688, function (items) {
    keywordList = items[KEYWORDS_1688];
    if (Array.isArray(keywordList) && keywordList.length > 0) {
        console.log("剩余关键词任务：", keywordList);

        if (!isRunning) {
            isRunning = true;
            goToNextKeyword(keywordList);
        }
    }
});

// 爬取搜索结果页
if (location.href.indexOf('selloffer/offer_search.htm') >= 0) {
    isRunning = true;
    notice = document.createElement("div");
    notice.id = "__1688searchSpider__";
    notice.appendChild(document.createTextNode("1688大力士 正在为你爬取关键词：" + JSON.stringify(result.page)));
    app.insertBefore(notice, app.firstElementChild);
    makeSureScrollToBottom();

    document.onreadystatechange = function () {
        if (document.readyState === 'complete') {
            setTimeout(() => {
                let products = $('.space-offer-card-box');
                if (products.length > 0) {
                    let details = []
                    for (let productDiv in products) {
                        let json = parseProductBlockAsJson(typeof productDiv == 'object' ? productDiv : products[productDiv]);
                        if (null == json) {
                            continue;
                        }
                        json.page = result.page;
                        if (json.href.indexOf("dj.1688.com") < 0) {
                            // 如果不是广告，则加入；
                            details.push(json.href);
                        }
                        sendResult(json);
                    }

                    updateDetailList(details, () => {
                        // 直接跳到第一个商品；
                        window.location.href = details.pop();
                    });
                }
            }, 3000);
        }
    }
    console.log("1688大力士 正在为你爬取关键词：" + JSON.stringify(result.page));
}

function updateDetailList(arr, callback) {
    chrome.storage.sync.set({ DETAILS_1688: arr }, function () {
        console.log("updated DetailList:" + JSON.stringify(arr));
        if (callback) {
            callback.call(this);
        }
    });
}

// 爬取detail页
if (location.href.indexOf('detail.1688.com/offer') >= 0) {
    isRunning = true;
    notice = document.createElement("div");
    notice.id = "__1688searchSpider__";
    notice.appendChild(document.createTextNode("1688大力士 正在为你爬取商品：" + JSON.stringify(result.page)));
    app.insertBefore(notice, app.firstElementChild);
    makeSureScrollToBottom();

    window.__counter = 0;

    window.__counter_interval = setInterval(() => {
        window.__counter += 1;
        try {
            window.__INIT_DATA = JSON.parse(document.body.innerHTML.split("window.__INIT_DATA=")[1].split('</script>')[0]);
        } catch (err) {
            console.error(err);
        }
        if (window.__INIT_DATA) {
            console.log('window.__INIT_DATA', window.__INIT_DATA, "window.__counter:", window.__counter);

            let json = window.__INIT_DATA;
            json.globalData.offerDomain = JSON.parse(json.globalData.offerDomain);
            sendResult(json, goToNextDetail);

            clearInterval(window.__counter_interval);
        }
        if (window.__counter > 2) {
            clearInterval(window.__counter_interval);
            goToNextDetail();
        }
    }, 500);

    console.log("1688大力士 正在为你爬取detail：" + JSON.stringify(result.page));
}


function parseProductBlockAsJson(productDiv) {
    let json = {};
    if (typeof productDiv != 'object' || !productDiv.getElementsByClassName) {
        console.log('this is not a div:', productDiv);
        return null;
    }
    json.innerText = productDiv.innerText;
    json.img = productDiv.getElementsByClassName("img")[0].style;
    json.href = $(productDiv).find('.mojar-element-title a')[0].href;
    json.companyLink = $(productDiv).find('.company-name a')[0].href;
    json.companyName = $(productDiv).find('.company-name')[0].innerText;
    json.price = $(productDiv).find('.mojar-element-price .price')[0].innerText;
    json.title = $(productDiv).find('.mojar-element-title .title')[0].innerText;
    json.img = json.img.backgroundImage.split('"')[1];
    return json;
}

function goToNextDetail() {
    let detailsList = [];
    chrome.storage.sync.get(DETAILS_1688, function (items) {
        detailsList = items[DETAILS_1688];
        if (Array.isArray(detailsList) && detailsList.length > 0) {
            console.log("剩余商品页面任务：", detailsList);

            let nextDetail = detailsList.pop();
            updateDetailList(detailsList, function () {
                setTimeout(() => {
                    window.location.href = nextDetail;
                }, 20000);
            });
        } else {
            // 如果当前的detail任务已经完毕，则进行下一个词的搜索
            goToNextKeyword();
        }
    });
}

function goToNextKeyword() {
    let keywords = [];
    chrome.storage.sync.get(KEYWORDS_1688, function (items) {
        keywords = items[KEYWORDS_1688];
        if (Array.isArray(keywords) && keywords.length > 0) {
            console.log("剩余关键词任务：", keywords);

            let nextKeyword = keywords.pop();
            updateKeywordList(keywords, function () {
                setTimeout(() => { goToKeyword(nextKeyword, 1); }, 15000)
            });
        }
    });
}

function updateKeywordList(arr, callback) {
    chrome.storage.sync.set({ KEYWORDS_1688: arr }, function () {
        console.log("updated KeywordList:" + JSON.stringify(arr));
        if (callback) {
            callback.call(this);
        }
    });
}

function makeSureScrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}

function goToKeyword(keyword, beginPage) {
    if (!keyword) {
        return;
    }

    beginPage = beginPage || 1;

    let form = document.createElement('form');
    form.method = 'get';
    form.style.display = 'none';
    form.acceptCharset = "GBK";
    let input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'keywords';
    input.value = keyword;
    form.appendChild(input);

    let input_beginPage = document.createElement('input');
    input_beginPage.type = 'hidden';
    input_beginPage.name = 'beginPage';
    input_beginPage.value = beginPage;
    form.appendChild(input_beginPage);

    let input_spm = document.createElement('input');
    input_spm.type = 'hidden';
    input_spm.name = 'spm';
    input_spm.value = "a26352.13672862.searchbox.input";
    form.appendChild(input_spm);

    form.target = '_top';
    document.body.appendChild(form);
    form.action = "https://s.1688.com/selloffer/offer_search.htm";
    form.submit();
}

function sendResult(json, callback) {
    console.log(json);
    let url = 'http://localhost:1688/api/1688search/sink';
    let request = new XMLHttpRequest();
    request.open('POST', url);
    request.setRequestHeader("X-Source", "1688");
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify(json));
    if (callback) {
        setTimeout(callback, 2000);
    }
}

function isBlockedByWarning() {
    let warnning = document.getElementsByClassName('warnning-text');
    if (!!warnning && warnning.length > 0) {
        alert("你需要先处理好淘宝防爬虫弹窗");
        return true;
    }
    return false;
}

function tableToObject(table) {
    var trs = table.rows,
        trl = trs.length,
        i = 0,
        j = 0,
        keys = [],
        obj, ret = [];

    for (; i < trl; i++) {
        if (i == 0) {
            for (; j < trs[i].children.length; j++) {
                keys.push(trs[i].children[j].innerText);
            }
        } else {
            obj = {};
            for (j = 0; j < trs[i].children.length; j++) {
                obj[keys[j]] = trs[i].children[j].innerText;
            }
            ret.push(obj);
        }
    }

    return ret;
};