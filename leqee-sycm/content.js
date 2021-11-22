console.log("running in content script");

app = document.getElementById("app");

node = document.createElement("script");
node.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js";
document.head.appendChild(node);

var search = location.search.substring(1);
let result = {};
result.page = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
result.page.url = document.location.toString();

let keywordList = [];
let isRunning = false;
chrome.storage.sync.get("SYCM_KEYWORDS", function (items) {
    keywordList = items['SYCM_KEYWORDS'];
    if (Array.isArray(keywordList) && keywordList.length > 0) {
        console.log("剩余关键词任务：", keywordList);

        if (!isRunning) {
            isRunning = true;
            goToNextKeyword(keywordList);
        }
    }
});

if (!!result.page.keyword) {
    isRunning = true;
    notice = document.createElement("div");
    notice.id = "leqeeSpyNotice";
    notice.appendChild(document.createTextNode("乐其\"生意参谋\"大力士 正在为你爬取关键词：" + result.page.keyword));

    app.insertBefore(notice, app.firstElementChild);

    document.onreadystatechange = function () {
        if (document.readyState === 'complete') {
            setTimeout(() => {
                if (isBlockedByWarning()) {
                    setTimeout(makeSurePageSize, 5000);
                } else {
                    makeSurePageSize();
                }

                let metrics = document.getElementsByClassName('oui-index-picker-item');
                for (let i = 0; i < metrics.length; i++) {
                    let li = metrics.item(i);
                    console.log(li.innerText);
                    if (li.innerText == '点击热度' || li.innerText == '支付转化率') {
                        li.getElementsByClassName('oui-checkbox').item(0).click();
                    }
                }

                let table = document.getElementsByClassName("contentContainer").item(0).getElementsByTagName("table").item(0);
                result.relatedKeywords = tableToObject(table);

                let pages = document.getElementsByClassName('ant-pagination-item');
                if (pages && pages.length > 1) {
                    for (let index = 1; index < pages.length; index++) {
                        pages.item(index).click();
                        table = document.getElementsByClassName("contentContainer").item(0).getElementsByTagName("table").item(0);
                        result.relatedKeywords = result.relatedKeywords.concat(tableToObject(table));
                    }
                }

                if (isBlockedByWarning()) {
                    setTimeout(clickRelatedBrand, 5000);
                } else {
                    clickRelatedBrand();
                }
                setTimeout(() => {
                    result.relatedBrands = tableToObject(table);

                    pages = document.getElementsByClassName('ant-pagination-item');
                    if (pages && pages.length > 1) {
                        for (let index = 1; index < pages.length; index++) {
                            pages.item(index).click();
                            table = document.getElementsByClassName("contentContainer").item(0).getElementsByTagName("table").item(0);
                            result.relatedBrands = result.relatedBrands.concat(tableToObject(table));
                        }
                    }

                    sendResult(result, function () {
                        if (!Array.isArray(keywordList) || keywordList.length <= 0) {
                            return;
                        }
                        goToNextKeyword(keywordList);
                    });
                }, 2000);
            }, 3000);
        }
    }
}

function goToNextKeyword(keywordList) {
    let keyword = keywordList.pop();
    chrome.storage.sync.set({ "SYCM_KEYWORDS": keywordList }, function () {
        console.log("updated keyword-list:" + JSON.stringify(keywordList));
        goToKeyword(keyword);
    });
}


function makeSurePageSize() {
    document.getElementsByClassName("oui-page-size-select").item(0).click();
    let pageSizeSelectors = document.getElementsByClassName("ant-select-dropdown-menu-item");
    pageSizeSelectors.item(pageSizeSelectors.length - 1).click();
}

function clickRelatedBrand() {
    document.getElementsByClassName("oui-tab-switch").item(1).getElementsByClassName("oui-tab-switch-item").item(1).click();
}


function goToKeyword(keyword) {
    if (!keyword) {
        return;
    }
    const url_template = 'https://sycm.taobao.com/mc/mq/search_analyze?activeKey=relation&dateRange=__day__%7C__day__&dateType=day&device=0&keyword=__keyword__';
    let day = new Date(new Date().getTime() - 3600 * 1000 * 24).toISOString().split("T")[0];
    let url = url_template.replaceAll("__keyword__", keyword);
    url = url.replaceAll("__day__", day);
    console.log("about to load:" + url);
    setTimeout(() => {
        //为了防止发送失败；
        window.location = url;
    }, 1030);
    return url;
}

function sendResult(result, callback) {
    //TODO: sent result;
    console.log(result);
    let url = 'http://localhost:10000/sycm/sink';

    chrome.storage.sync.get("SYCM_DATA_SINK_URL", function (items) {
        if (items['SYCM_DATA_SINK_URL']) {
            url = items['SYCM_DATA_SINK_URL'];
        }

        let request = new XMLHttpRequest();
        request.open('POST', url);
        request.setRequestHeader("X-Leqee", "Sycm");
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(result));
        if (callback) {
            request.onload = callback;
        }
    });
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