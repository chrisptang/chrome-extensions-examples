console.log("running in content script");

KEYWORDS_1688 = 'KEYWORDS_1688';

DETAILS_1688 = 'DETAILS_1688';

app = document.getElementById("app") || document.getElementById('root-container') || document.getElementById('content') || document.body;

let params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
let page = { params }, result = { page };
result.page.url = document.location.toString();

let keywordList = [];
let isRunning = ('1' == result.page.params.running);
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
if (isRunning && location.href.indexOf('selloffer/offer_search.htm') >= 0) {
    notice = document.createElement("div");
    notice.id = "__1688searchSpider__";
    notice.appendChild(document.createTextNode("1688大力士 正在为你爬取关键词：" + JSON.stringify(result.page)));
    app.insertBefore(notice, app.firstElementChild);
    makeSureScrollToBottom();

    let newKeywordParams = { ...params };
    if (newKeywordParams.beginPage < 4) {
        // 最多爬取前4页
        newKeywordParams.beginPage += 1;
        newKeywordParams.running = 1;

        let queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
        let newUrl = window.location.href.split('?')[0] + '?' + queryString;
        addNewKeyword(newUrl);
    }

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
    let detailsList = [], allList = [...arr];
    chrome.storage.sync.get(DETAILS_1688, function (items) {
        detailsList = items[DETAILS_1688];
        if (Array.isArray(detailsList) && detailsList.length > 0) {
            allList.push(...detailsList);
        }
        let newList = [...(new Set([...allList]))];
        replaceDetailList(newList, callback);
    });
}

function replaceDetailList(arr, callback) {
    let newList = [...(new Set([...arr]))], _this = this;
    chrome.storage.sync.set({ DETAILS_1688: newList }, function () {
        console.log("updated DetailList:" + JSON.stringify(newList));
        if (callback) {
            callback.call(_this);
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

    try {
        window.__INIT_DATA = JSON.parse(document.body.innerHTML.split("window.__INIT_DATA=")[1].split('</script>')[0]);
    } catch (err) {
        console.warn(err);
        if (document.body.innerHTML.indexOf("厂货通") > 0 && $('.cht-pc-header').length > 0) {
            let json = parseChtDetailPage();
            sendResult(json, goToNextDetail);
        } else {
            console.warn("\n\n\n###这是一个老旧的detail页面");
            goToNextDetail();
        }
    }
    if (window.__INIT_DATA) {
        console.log('window.__INIT_DATA', window.__INIT_DATA, "window.__counter:", window.__counter);

        let json = window.__INIT_DATA;
        json.globalData.offerDomain = JSON.parse(json.globalData.offerDomain);
        sendResult(json, goToNextDetail);
    }
    console.log("1688大力士 正在为你爬取detail：" + JSON.stringify(result.page));
}

// 厂货通和普通的detail page不一样，没有window.__INIT_DATA；
// 因此需要特殊处理
function parseChtDetailPage() {
    // 页面的meta
    let json = {}, meta = {}, metalist = $("meta");
    for (let idx = 0; idx < metalist.length; idx++) {
        let key = metalist[idx].getAttribute("name") || metalist[idx].getAttribute('property');
        if (key) {
            meta[key] = metalist[idx].getAttribute("content");
        }
    }
    json.meta = meta;
    json.innerText = document.getElementById("mod-detail-bd").innerText;

    //轮播图；
    let gallery = $('.mod-detail-version2018-gallery')[0].dataset, galleryJson = {};
    galleryJson.galleryImageList = gallery.galleryImageList.trim().split(",");
    galleryJson.modConfig = JSON.parse(gallery.modConfig);
    json.gallery = galleryJson;

    // SKU list
    let skuList = [], skuTableTrList = $("table.table-sku tr");
    for (let idx = 0; idx < skuTableTrList.length; idx++) {
        let sku = JSON.parse(skuTableTrList[idx].dataset.skuConfig);
        sku.price = $(skuTableTrList[idx]).find("td.price")[0].innerText
        skuList.push(sku);
    }
    json.skuList = skuList;

    // feature list
    json.featureList = JSON.parse($('#mod-detail-attributes')[0].dataset.featureJson);

    // detail image list;
    let descriptionImgList = $('#mod-detail-description img').toArray(), imgList = [];
    for (let idx in descriptionImgList) {
        if (descriptionImgList[idx].src) {
            imgList.push(descriptionImgList[idx].src);
        }
    }
    json.descriptionImgList = imgList;

    return json;
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
            replaceDetailList(detailsList, function () {
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
            let nextKeyword = keywords.pop();
            console.log("剩余关键词任务：", keywords);
            updateKeywordList(keywords, function () {
                setTimeout(() => { goToKeyword(nextKeyword, 1); }, 15000)
            });
        }
    });
}

function addNewKeyword(newKeyword) {
    let keywords = [];
    chrome.storage.sync.get(KEYWORDS_1688, function (items) {
        keywords = items[KEYWORDS_1688] || [];
        if (Array.isArray(keywords) && keywords.length > 0) {
            keywords.push(newKeyword);
            updateKeywordList(keywords, function () {
                console.log("新增了一个关键词任务：", keywords);
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

    // 也有可能直接是一个link
    if (keyword.indexOf("s.1688.com/selloffer/offer_search") > 0) {
        window.location.href = keyword;
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

    let input_running = document.createElement('input');
    input_running.type = 'hidden';
    input_running.name = 'running';
    input_running.value = "1";
    form.appendChild(input_running);

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