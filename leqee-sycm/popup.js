// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Search the bookmarks when entering the search keyword.
let color = 0;
$(function () {
  $('#btnAddTasks').click(e => {
    let words = document.getElementById("textTasksToAdd").value;
    if (!!words) {
      words = words.split("\n");
      if (words.length > 25) {
        words = words.slice(0, 25);
        alert("您输入的关键词超过25个，将仅保存前25个。");
      }
      chrome.storage.sync.set({ "SYCM_KEYWORDS": words }, function () {
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
    chrome.storage.sync.set({ "SYCM_KEYWORDS": [] }, function () {
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
  chrome.storage.sync.get(["SYCM_KEYWORDS"], function (items) {
    console.log(items);
    items = items["SYCM_KEYWORDS"];
    if (Array.isArray(items) && items.length > 0) {
      let keyword = items.pop();
      let url = buildUrl(keyword);
      console.log("about to open:" + url);
      window.open(url);
    } else {
      alert("当前任务列表为空，您可以添加关键词任务才能爬取数据");
    }
  });
}

function buildUrl(keyword) {
  const url_template = 'https://sycm.taobao.com/mc/mq/search_analyze?activeKey=relation&dateRange=__day__%7C__day__&dateType=day&device=0&keyword=__keyword__';
  let day = new Date(new Date().getTime() - 3600 * 1000 * 24).toISOString().split("T")[0];
  let url = url_template.replaceAll("__keyword__", keyword);
  url = url.replaceAll("__day__", day);
  return url;
}

function loadData() {
  chrome.storage.sync.get(["SYCM_KEYWORDS"], function (items) {
    console.log(items);
    items = items["SYCM_KEYWORDS"];
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
