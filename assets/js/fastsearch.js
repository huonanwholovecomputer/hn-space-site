import * as params from '@params';

/* 元素改为 let：PJAX 进入 /search/ 后由 initFastSearch 重新抓取新 <main> 里的元素 */
let resList, sInput, searchBox;

let fuse;
let currentElement = null;
let firstResult = null;
let lastResult = null;

const defaultFuseOptions = {
    distance: 100,
    threshold: 0.4,
    ignoreLocation: true,
    keys: ['title', 'permalink', 'summary', 'content']
};

const buildFuseOptions = () => {
    if (!params.fuseOpts) {
        return defaultFuseOptions;
    }

    return {
        isCaseSensitive: params.fuseOpts.iscasesensitive ?? false,
        includeScore: params.fuseOpts.includescore ?? false,
        includeMatches: params.fuseOpts.includematches ?? false,
        minMatchCharLength: params.fuseOpts.minmatchcharlength ?? 1,
        shouldSort: params.fuseOpts.shouldsort ?? true,
        findAllMatches: params.fuseOpts.findallmatches ?? false,
        keys: params.fuseOpts.keys ?? defaultFuseOptions.keys,
        location: params.fuseOpts.location ?? 0,
        threshold: params.fuseOpts.threshold ?? defaultFuseOptions.threshold,
        distance: params.fuseOpts.distance ?? defaultFuseOptions.distance,
        ignoreLocation: params.fuseOpts.ignorelocation ?? defaultFuseOptions.ignoreLocation
    };
};

const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), delay);
    };
};

const reset = () => {
    currentElement = null;
    firstResult = null;
    lastResult = null;
    resList.innerHTML = '';
    sInput.value = '';
    sInput.focus();
};

const setActiveResult = (element) => {
    document.querySelectorAll('.focus').forEach((item) => item.classList.remove('focus'));

    if (!element) {
        return;
    }

    element.focus();
    element.parentElement?.classList.add('focus');
    currentElement = element;
};

const renderResults = (results) => {
    if (!Array.isArray(results) || results.length === 0) {
        resList.innerHTML = '';
        firstResult = lastResult = currentElement = null;
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const result of results) {
        const li = document.createElement('li');
        const titleText = document.createTextNode(result.item.title);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.classList.add('feather', 'feather-chevrons-right');

        svg.innerHTML = '<polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline>';

        const link = document.createElement('a');
        link.className = 'entry-link';
        link.href = result.item.permalink;
        link.setAttribute('aria-label', result.item.title);

        li.appendChild(titleText);
        li.appendChild(svg);
        li.appendChild(link);
        fragment.appendChild(li);
    }

    resList.innerHTML = '';
    resList.appendChild(fragment);
    firstResult = resList.firstElementChild;
    lastResult = resList.lastElementChild;
};

const performSearch = () => {
    if (!fuse) {
        return;
    }

    const query = sInput.value.trim();
    if (!query) {
        renderResults([]);
        return;
    }

    const searchOptions = params.fuseOpts?.limit ? { limit: params.fuseOpts.limit } : undefined;
    const results = searchOptions ? fuse.search(query, searchOptions) : fuse.search(query);
    renderResults(results);
};

const initSearch = async () => {
    if (!sInput || !resList) {
        return;
    }
    /* 同一输入框只初始化一次（防整页加载时脚本执行 + load 事件重复初始化） */
    if (sInput.dataset.fastInit) {
        return;
    }
    sInput.dataset.fastInit = '1';
    sInput.disabled = false;
    sInput.focus();

    try {
        const response = await fetch('../index.json');
        if (!response.ok) {
            throw new Error(`Search index load failed: ${response.status}`);
        }

        const data = await response.json();
        if (data) {
            fuse = new Fuse(data, buildFuseOptions());
        }
    } catch (error) {
        console.error(error);
    }
};

/* ===== PJAX 友好改造 =====
   fastsearch.js 原版只在整页加载时运行一次（window load 触发），且事件绑定
   在脚本执行时捕获的元素上。PJAX 替换 <main> 后新输入框既不会自动启用、
   也没有任何绑定，所以 /search/ 此前被排除在 PJAX 之外。
   现在把「抓取元素 + 绑定 + 初始化」收敛为可重复调用的 initFastSearch：
   - 整页加载：脚本执行时立即调用一次（等价于原 load 时机，输入框更早可用）；
   - PJAX 进入 /search/：pjax.js 在替换 <main> 后调用 window.initFastSearch，
     重新抓取新输入框并绑定，搜索功能在无刷新导航下保持可用；
   - 用 dataset 标记保证同一元素不重复绑定/初始化，全局键盘导航只绑一次。 */
function initFastSearch() {
    resList = document.getElementById('searchResults');
    sInput = document.getElementById('searchInput');
    searchBox = document.getElementById('searchbox');
    if (!sInput || !resList) {
        return;
    }
    if (!sInput.dataset.fastBound) {
        sInput.dataset.fastBound = '1';
        sInput.addEventListener('input', debounce(performSearch, 150));
        sInput.addEventListener('search', () => {
            if (!sInput.value) {
                reset();
            }
        });
    }
    initSearch();
}
window.initFastSearch = initFastSearch;

/* 全局键盘导航：整个页面生命周期只绑定一次 */
if (!window.__fastsearchKeyBound) {
    window.__fastsearchKeyBound = true;
    document.addEventListener('keydown', (event) => {
        const { key } = event;
        const active = document.activeElement;
        const isInSearchBox = searchBox?.contains(active);

        if (key === 'Escape') {
            reset();
            return;
        }

        if (!firstResult || !isInSearchBox) {
            return;
        }

        if (key === 'ArrowDown') {
            event.preventDefault();

            if (active === sInput) {
                setActiveResult(firstResult.querySelector('.entry-link'));
            } else if (active?.parentElement !== lastResult) {
                setActiveResult(active?.parentElement?.nextElementSibling?.querySelector('.entry-link'));
            }
        } else if (key === 'ArrowUp') {
            event.preventDefault();

            if (active?.parentElement === firstResult) {
                setActiveResult(sInput);
            } else if (active !== sInput) {
                setActiveResult(active?.parentElement?.previousElementSibling?.querySelector('.entry-link'));
            }
        } else if (key === 'ArrowRight') {
            if (active?.matches?.('.entry-link')) {
                active.click();
            }
        }
    });
}

/* 立即初始化（PJAX 注入脚本后也能直接生效）；再兜底等 window load 一次 */
window.addEventListener('load', initFastSearch);
initFastSearch();
