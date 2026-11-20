/* iLexicon · LS 拉汉词典前端（纯静态，按需加载分片） */
(function () {
    "use strict";

    var INDEX = [];            // [seq, lemma, pos, block]
    var blockCache = {};       // block -> detail[]
    var state = { query: "", letter: "", activeSeq: null };
    var MAX_RESULTS = 100;

    var $ = function (id) { return document.getElementById(id); };
    var searchBox = $("search"), alphaBar = $("alpha"),
        meta = $("meta"), list = $("results"), detail = $("detail");

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function firstLetter(lemma) {
        var m = /[a-zA-Z]/.exec(lemma || "");
        return m ? m[0].toLowerCase() : "#";
    }

    function loadIndex() {
        return fetch("index.json")
            .then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .then(function (data) { INDEX = data; renderAlpha(); renderList(); })
            .catch(function () {
                meta.textContent = "索引加载失败，请通过本地服务器或 Pages 访问。";
            });
    }

    function renderAlpha() {
        var letters = "abcdefghijklmnopqrstuvwxyz#".split("");
        alphaBar.innerHTML = "";
        letters.forEach(function (L) {
            var b = document.createElement("button");
            b.type = "button";
            b.textContent = L.toUpperCase();
            b.className = state.letter === L ? "active" : "";
            b.addEventListener("click", function () {
                state.letter = state.letter === L ? "" : L;
                renderAlpha(); renderList();
            });
            alphaBar.appendChild(b);
        });
    }

    function filtered() {
        var q = state.query.trim().toLowerCase();
        return INDEX.filter(function (it) {
            var lemma = (it[1] || "").toLowerCase();
            if (state.letter && firstLetter(it[1]) !== state.letter) return false;
            if (q && lemma.indexOf(q) === -1) return false;
            return true;
        });
    }

    function renderList() {
        var hits = filtered();
        var total = hits.length;
        var shown = hits.slice(0, MAX_RESULTS);
        meta.textContent = "共 " + total + " 条" + (total > MAX_RESULTS ? "，显示前 " + MAX_RESULTS + " 条" : "");
        list.innerHTML = "";
        if (!shown.length) {
            list.innerHTML = '<div class="result-item"><span class="pending">无匹配条目</span></div>';
            return;
        }
        shown.forEach(function (it) {
            var seq = it[0], lemma = it[1], pos = it[2], block = it[3];
            var item = document.createElement("div");
            item.className = "result-item";
            item.innerHTML =
                '<span class="result-head">' + esc(lemma) + "</span>" +
                '<span class="result-pos">' + esc(pos) + "</span>";
            item.addEventListener("click", function () { openEntry(seq, block); });
            list.appendChild(item);
        });
    }

    function loadBlock(block) {
        if (blockCache[block]) return Promise.resolve(blockCache[block]);
        return fetch("data/" + block + ".json")
            .then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .then(function (data) { blockCache[block] = data; return data; });
    }

    function showDetailMessage(text) {
        detail.style.display = "block";
        detail.innerHTML = '<div class="pending">' + esc(text) + "</div>";
    }

    function openEntry(seq, block) {
        detail.style.display = "block";
        detail.innerHTML = '<div class="loading">正在加载条目…</div>';
        loadBlock(block).then(function (data) {
            var entry = data.find(function (d) { return String(d.seq) === String(seq); });
            if (entry) {
                renderDetail(entry);
            } else {
                showDetailMessage("未找到该条目详情。");
            }
        }).catch(function () {
            showDetailMessage("条目加载失败，请检查网络后重试。");
        });
    }

    function renderDetail(e) {
        state.activeSeq = e.seq;
        var head = e.headword_raw || e.lemma;
        var zh = (e.def_zh || "").trim();
        var html = "";
        html += '<div class="detail-head">' +
            '<span class="detail-title">' + esc(head) + "</span>" +
            (e.pos ? '<span class="detail-pos">' + esc(e.pos) + "</span>" : "") +
            (e.crossref ? '<span class="tag">交叉引用</span>' : "") +
            "</div>";
        if (e.etymology_raw) {
            html += '<div class="detail-etym">词源：' + esc(e.etymology_raw) + "</div>";
        }
        if (zh) {
            html += '<div class="zh-block"><h4>汉译</h4><div>' + esc(zh) + "</div></div>";
        } else {
            html += '<div class="zh-block pending">汉译待补（初稿未译）</div>';
        }
        html += '<h4 style="font-family:var(--font-serif);margin:16px 0 6px;">原文释义</h4>';
        html += '<div class="detail-body">' + esc(e.raw) + "</div>";
        detail.innerHTML = html;
        detail.style.display = "block";
        detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    var debounce;
    searchBox.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            state.query = searchBox.value;
            detail.style.display = "none";   // 新检索时收起旧详情
            renderList();
        }, 120);
    });

    loadIndex();
})();
