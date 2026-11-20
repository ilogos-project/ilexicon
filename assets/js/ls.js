/* iLexicon · LS 拉汉词典前端（纯静态，三栏：左词条 / 中原文 / 右汉译） */
(function () {
    "use strict";

    var INDEX = [];            // [seq, lemma, pos, block]
    var blockCache = {};       // block -> detail[]
    var state = { query: "", letter: "", activeSeq: null };
    var MAX_RESULTS = 100;

    var $ = function (id) { return document.getElementById(id); };
    var searchBox = $("search"), alphaBar = $("alpha"),
        meta = $("meta"), list = $("results"),
        detail = $("detail"), zhPanel = $("zh-panel");

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function firstLetter(lemma) {
        var m = /[a-zA-Z]/.exec(lemma || "");
        return m ? m[0].toLowerCase() : "#";
    }

    /* ---------- 初始占位 ---------- */
    function renderPlaceholders() {
        detail.innerHTML =
            '<div class="placeholder">' +
            '<i class="fas fa-book-open"></i>' +
            '<p>从左侧选择词条，或在上方检索拉丁头词。</p>' +
            "</div>";
        zhPanel.innerHTML =
            '<div class="placeholder">' +
            "<p>汉译将在此栏呈现。</p>" +
            "</div>";
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
        var shown = hits.slice(0, MAX_RESULTS);
        meta.textContent = "";
        list.innerHTML = "";
        if (!shown.length) {
            list.innerHTML = '<div class="entry-item pending">无匹配条目</div>';
            return;
        }
        shown.forEach(function (it) {
            var seq = it[0], lemma = it[1], pos = it[2], block = it[3];
            var item = document.createElement("div");
            item.className = "entry-item" + (String(seq) === String(state.activeSeq) ? " active" : "");
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

    function openEntry(seq, block) {
        detail.innerHTML = '<div class="loading">正在加载条目…</div>';
        zhPanel.innerHTML = "";
        loadBlock(block).then(function (data) {
            var entry = data.find(function (d) { return String(d.seq) === String(seq); });
            if (entry) {
                state.activeSeq = entry.seq;
                renderDetail(entry);
                renderZh(entry);
                renderList();   // 刷新左栏高亮
            } else {
                detail.innerHTML = '<div class="pending">未找到该条目详情。</div>';
            }
        }).catch(function () {
            detail.innerHTML = '<div class="pending">条目加载失败，请检查网络后重试。</div>';
        });
    }

    /* 中栏：完全保留 LS 原词典面貌（头词、词性 + 原文整段） */
    function renderDetail(e) {
        var head = e.headword_raw || e.lemma;
        var html = '<div class="detail-head">' +
            '<span class="detail-title">' + esc(head) + "</span>" +
            (e.pos ? '<span class="detail-pos">' + esc(e.pos) + "</span>" : "") +
            "</div>";
        html += '<div class="detail-body">' + esc(e.raw) + "</div>";
        detail.innerHTML = html;
    }

    /* 右栏：结构化汉译（词性 / 变格 / 参见 / 义项 / 例句） */
    function renderZh(e) {
        var pos = (e.pos || "").trim();
        var infl = (e.infl || "").trim();
        var xref = (e.xref || "").trim();
        var zh = (e.def_zh || "").trim();
        var ex = (e.examples_zh || "").trim();
        var html = '<h4 class="zh-panel-title">汉译</h4>';

        if (pos || infl) {
            html += '<div class="zh-meta">';
            if (pos) html += '<span class="zh-pos">' + esc(pos) + "</span>";
            if (infl) html += '<span class="zh-infl">' + esc(infl) + "</span>";
            html += "</div>";
        }
        if (xref) {
            html += '<div class="zh-xref">参见：' + esc(xref) + "</div>";
        }
        if (zh) {
            var lines = zh.split(/\n+/).filter(Boolean);
            html += '<div class="zh-block">';
            lines.forEach(function (line, i) {
                html += '<div class="zh-sense">' + esc(line) + "</div>";
            });
            html += "</div>";
        } else {
            html += '<div class="zh-block pending">汉译待补（初稿未译）</div>';
        }
        if (ex) {
            html += '<h4 class="detail-section">例句汉译</h4>';
            html += '<div class="zh-block">' + esc(ex) + "</div>";
        }
        html += '<p class="zh-note">义项与例句汉译分批补校；语法术语、作者与书名缩略保留原文。</p>';
        zhPanel.innerHTML = html;
    }

    var debounce;
    searchBox.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            state.query = searchBox.value;
            renderList();
        }, 120);
    });

    renderPlaceholders();
    loadIndex();
})();
