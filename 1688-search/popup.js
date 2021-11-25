// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Search the bookmarks when entering the search keyword.
let color = 0;
KEYWORDS_1688 = 'KEYWORDS_1688';
DETAILS_1688 = 'DETAILS_1688';
$(function () {
  $('#btnAddTasks').click(e => {
    let words = document.getElementById("textTasksToAdd").value;
    if (!!words) {
      words = words.split("\n");
      if (words.length > 25) {
        words = words.slice(0, 25);
        alert("您输入的关键词超过25个，将仅保存前25个。");
      }
      chrome.storage.sync.set({ KEYWORDS_1688: words }, function () {
        alert("关键词已保存，可以点击‘确定’按钮开启任务");
        loadData();
        triggerSpider();
      });
    }
  });

  $('#btnStorage').click(e => {
    loadData();
  });

  $("#btnCleanStorage").click(e => {
    chrome.storage.sync.set({ KEYWORDS_1688: [] }, function () {
      loadData();
    });
    chrome.storage.sync.set({ DETAILS_1688: [] }, function () {
      loadData();
    });
  });

  $("#btnUpdateSinkServiceUrl").click(e => {
    chrome.storage.sync.set({ "SYCM_DATA_SINK_URL": $("#textSinkServiceUrl").val() }, function () {
      loadSinkServiceUrl();
    });
  });

  $('#btnStartTasks').click(e => {
    triggerSpider();
  });
});

document.addEventListener('DOMContentLoaded', function () {
  loadData();
  loadSinkServiceUrl();
});

function loadSinkServiceUrl() {
  let url = 'http://localhost:10000/sycm/sink';
  chrome.storage.sync.get("SYCM_DATA_SINK_URL", function (items) {
    if (items['SYCM_DATA_SINK_URL']) {
      url = items['SYCM_DATA_SINK_URL'];
    }

    $("#textSinkServiceUrl").val(url);
  });
}

function triggerSpider() {
  console.log("开始爬取数据...");
  // 详情页和搜索页爬取是一个循环队列：
  // 先爬完detail、再爬去一个搜索词，再爬上一个搜索词添加的detail，如此往复；
  window.location.href = 'https://detail.1688.com/offer/623616959632.html';
  // chrome.storage.sync.get([KEYWORDS_1688], function (items) {
  //   console.log(items);
  //   items = items[KEYWORDS_1688];
  //   if (Array.isArray(items) && items.length > 0) {
  //     let keyword = items.pop();
  //     buildUrl(keyword);
  //   } else {
  //     alert("当前任务列表为空，您可以添加关键词任务才能爬取数据");
  //   }
  // });
}

function buildUrl(keyword) {
  if (!keyword) {
    return;
  }

  let beginPage = 1;

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

function loadData() {
  chrome.storage.sync.get([KEYWORDS_1688], function (items) {
    console.log(items);
    items = items[KEYWORDS_1688];
    let div = $("#keywordTaskList");
    if (Array.isArray(items) && items.length > 0) {
      if (!!div) {
        div.text(items.join(", "));
      }
    } else {
      alert("当前任务列表为空，您可以添加关键词任务");
      if (!!div) {
        div.text("");
      }
    }
  });
}
